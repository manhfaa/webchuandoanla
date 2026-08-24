package vn.agromind.app.core.database

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import vn.agromind.app.core.network.dto.CropPlanListItemDto
import vn.agromind.app.core.network.dto.FarmPlotDto
import vn.agromind.app.core.network.dto.ReminderDto
import vn.agromind.app.core.network.dto.TraceabilityDto
import vn.agromind.app.feature.history.data.HistoryItem
import javax.inject.Inject
import javax.inject.Singleton

@Entity(tableName = "api_cache")
data class ApiCacheEntity(
    @PrimaryKey val cacheKey: String,
    val payload: String,
    val updatedAt: Long,
)

@Entity(tableName = "reminder_cache")
data class ReminderCacheEntity(
    @PrimaryKey val id: Int,
    val payload: String,
    val triggerTime: String,
    val read: Boolean,
    val notifiedAt: Long? = null,
)

@Dao
interface OfflineCacheDao {
    @Query("SELECT * FROM api_cache WHERE cacheKey = :key")
    suspend fun get(key: String): ApiCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(row: ApiCacheEntity)

    @Query("DELETE FROM api_cache")
    suspend fun clear()

    @Query("SELECT COUNT(*) FROM api_cache")
    fun observeCount(): Flow<Int>
}

@Dao
interface ReminderCacheDao {
    @Query("SELECT * FROM reminder_cache WHERE read = 0 ORDER BY triggerTime")
    suspend fun unread(): List<ReminderCacheEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(rows: List<ReminderCacheEntity>)

    @Query("DELETE FROM reminder_cache")
    suspend fun clear()

    @Query("UPDATE reminder_cache SET notifiedAt = :time WHERE id = :id")
    suspend fun markNotified(id: Int, time: Long)

    @Transaction
    suspend fun replace(rows: List<ReminderCacheEntity>) {
        clear()
        upsertAll(rows)
    }
}

/** Small typed cache facade. Network DTOs stay the single source of truth. */
@Singleton
class OfflineCache @Inject constructor(
    private val dao: OfflineCacheDao,
    private val reminders: ReminderCacheDao,
    private val json: Json,
) {
    val hasData: Flow<Boolean> = dao.observeCount().map { it > 0 }
    suspend fun savePlots(value: List<FarmPlotDto>) = put(PLOTS, json.encodeToString(value))
    suspend fun plots(): List<FarmPlotDto>? =
        get(PLOTS)?.let { runCatching { json.decodeFromString<List<FarmPlotDto>>(it) }.getOrNull() }

    suspend fun savePlans(value: List<CropPlanListItemDto>) = put(PLANS, json.encodeToString(value))
    suspend fun plans(): List<CropPlanListItemDto>? =
        get(PLANS)?.let { runCatching { json.decodeFromString<List<CropPlanListItemDto>>(it) }.getOrNull() }

    suspend fun saveTraceability(value: List<TraceabilityDto>) = put(TRACEABILITY, json.encodeToString(value))
    suspend fun traceability(): List<TraceabilityDto>? =
        get(TRACEABILITY)?.let { runCatching { json.decodeFromString<List<TraceabilityDto>>(it) }.getOrNull() }

    suspend fun saveHistory(value: List<HistoryItem>) = put(HISTORY, json.encodeToString(value))
    suspend fun history(): List<HistoryItem>? =
        get(HISTORY)?.let { runCatching { json.decodeFromString<List<HistoryItem>>(it) }.getOrNull() }

    suspend fun saveReminders(value: List<ReminderDto>) {
        reminders.replace(
            value.map {
                ReminderCacheEntity(
                    id = it.id,
                    payload = json.encodeToString(it),
                    triggerTime = it.triggerTime,
                    read = it.read,
                )
            },
        )
        put(REMINDERS, json.encodeToString(value))
    }

    suspend fun reminders(): List<ReminderDto>? =
        get(REMINDERS)?.let { runCatching { json.decodeFromString<List<ReminderDto>>(it) }.getOrNull() }

    suspend fun clearPersonal() {
        dao.clear()
        reminders.clear()
    }

    private suspend fun put(key: String, payload: String) {
        dao.put(ApiCacheEntity(key, payload, System.currentTimeMillis()))
    }

    private suspend fun get(key: String): String? = dao.get(key)?.payload

    private companion object {
        const val PLOTS = "plots"
        const val PLANS = "crop_plans"
        const val TRACEABILITY = "traceability"
        const val REMINDERS = "reminders"
        const val HISTORY = "history"
    }
}
