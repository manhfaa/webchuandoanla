package vn.agromind.app.core.database

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * The leaf check in progress, on disk.
 *
 * The reason this is a database row and not just `SavedStateHandle`: a grower
 * takes the photo, starts typing symptoms, and the phone rings. Android is free
 * to kill the process during that call, and `SavedStateHandle` only survives if
 * the system got to write the saved-state bundle — which it does not guarantee,
 * and which in any case has a ~1 MB ceiling that a photo path plus a full CNN
 * payload has no business approaching.
 *
 * So the draft is written after every meaningful step. Coming back means picking
 * up on the same step with the same photo and the same half-finished sentence,
 * which is the difference between a tool someone trusts in a field and one they
 * stop using after the second time it lost their work.
 *
 * Exactly one draft at a time. The check is a modal, four-step task; two
 * half-finished ones would raise "which photo am I looking at?" with no answer
 * worth giving.
 */
@Entity(tableName = "diagnosis_draft")
data class DiagnosisDraftEntity(
    @PrimaryKey val id: Int = SINGLETON,

    /** Absolute path inside the private cache. Null before a photo is chosen. */
    val photoPath: String? = null,
    val originalBytes: Long = 0,
    val uploadBytes: Long = 0,
    val photoWidth: Int = 0,
    val photoHeight: Int = 0,
    val inputMethod: String = "upload",

    /**
     * The id sent with the leaf check.
     *
     * Generated once, when the upload is first attempted, and reused for every
     * retry of *that* photo. This is what makes a dropped upload cost one
     * inference call instead of one per retry — the server returns the first
     * answer for a repeated id.
     */
    val cnnRequestId: String? = null,

    /** Same idea for the verification run, which costs two Tavily searches. */
    val researchRequestId: String? = null,

    val symptoms: String = "",

    /** Server payloads, kept raw so a retry needs no re-analysis. */
    val detectionJson: String? = null,
    val classificationJson: String? = null,
    val researchJson: String? = null,

    /** Name of the [vn.agromind.app.feature.diagnosis.domain.DiagnosisState] to restore. */
    val stateName: String = "Draft",

    val updatedAt: Long = 0,
) {
    companion object {
        const val SINGLETON = 1
    }
}

@Dao
interface DiagnosisDraftDao {

    @Query("SELECT * FROM diagnosis_draft WHERE id = :id")
    fun observe(id: Int = DiagnosisDraftEntity.SINGLETON): Flow<DiagnosisDraftEntity?>

    @Query("SELECT * FROM diagnosis_draft WHERE id = :id")
    suspend fun load(id: Int = DiagnosisDraftEntity.SINGLETON): DiagnosisDraftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(draft: DiagnosisDraftEntity)

    @Query("DELETE FROM diagnosis_draft")
    suspend fun clear()
}
