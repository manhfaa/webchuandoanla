package vn.agromind.app.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Database(
    entities = [DiagnosisDraftEntity::class, ApiCacheEntity::class, ReminderCacheEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class AgromindDatabase : RoomDatabase() {
    abstract fun diagnosisDraftDao(): DiagnosisDraftDao
    abstract fun offlineCacheDao(): OfflineCacheDao
    abstract fun reminderCacheDao(): ReminderCacheDao
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun database(@ApplicationContext context: Context): AgromindDatabase =
        Room.databaseBuilder(context, AgromindDatabase::class.java, "agromind.db")
            // Deliberately no fallbackToDestructiveMigration(). This database
            // holds the grower's in-progress leaf check and, later, their offline
            // cache; silently wiping it on a schema change would make a routine
            // app update look like data loss. A missing migration should fail
            // loudly in development instead.
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides
    fun diagnosisDraftDao(db: AgromindDatabase): DiagnosisDraftDao = db.diagnosisDraftDao()

    @Provides
    fun offlineCacheDao(db: AgromindDatabase): OfflineCacheDao = db.offlineCacheDao()

    @Provides
    fun reminderCacheDao(db: AgromindDatabase): ReminderCacheDao = db.reminderCacheDao()

    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `api_cache` (`cacheKey` TEXT NOT NULL, `payload` TEXT NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`cacheKey`))",
            )
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `reminder_cache` (`id` INTEGER NOT NULL, `payload` TEXT NOT NULL, `triggerTime` TEXT NOT NULL, `read` INTEGER NOT NULL, `notifiedAt` INTEGER, PRIMARY KEY(`id`))",
            )
        }
    }
}
