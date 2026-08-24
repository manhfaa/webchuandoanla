package vn.agromind.app.core.reminders

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.serialization.json.Json
import vn.agromind.app.MainActivity
import vn.agromind.app.R
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.database.ReminderCacheDao
import vn.agromind.app.core.network.api.CropPlanApi
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.ReminderDto
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.util.concurrent.TimeUnit

object ReminderScheduler {
    private const val PERIODIC_SYNC = "agromind-reminder-sync"
    private const val TAG = "agromind-account-work"

    fun start(context: Context) {
        val request = PeriodicWorkRequestBuilder<ReminderSyncWorker>(6, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_SYNC,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
        refreshNow(context)
    }

    fun refreshNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<ReminderSyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "$PERIODIC_SYNC-now",
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    fun stop(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(TAG)
    }

    fun scheduleNotification(context: Context, reminder: ReminderDto) {
        if (reminder.read || reminder.status == "cancelled") return
        val trigger = reminder.triggerInstant() ?: return
        val delay = Duration.between(Instant.now(), trigger).toMillis().coerceAtLeast(0)
        val data = Data.Builder()
            .putInt(ReminderNotificationWorker.ID, reminder.id)
            .putString(ReminderNotificationWorker.TITLE, reminder.title)
            .putString(ReminderNotificationWorker.BODY, reminder.body)
            .putString(ReminderNotificationWorker.DEEP_LINK, reminder.deepLink)
            .build()
        val request = OneTimeWorkRequestBuilder<ReminderNotificationWorker>()
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .setInputData(data)
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "agromind-reminder-${reminder.id}",
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }
}

@HiltWorker
class ReminderSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val api: CropPlanApi,
    private val farmApi: FarmApi,
    private val cache: OfflineCache,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = runCatching {
        val reminders = api.reminders(filter = "upcoming", pageSize = 100).results
        cache.saveReminders(reminders)
        reminders.forEach { ReminderScheduler.scheduleNotification(applicationContext, it) }
        // One optional section failing must not prevent due notifications from
        // being scheduled. Each successful section still refreshes its cache.
        runCatching { cache.savePlans(api.plans(pageSize = 50).results) }
        runCatching { cache.savePlots(farmApi.plots()) }
        runCatching { cache.saveTraceability(farmApi.traceability()) }
    }.fold(onSuccess = { Result.success() }, onFailure = { Result.retry() })
}

@HiltWorker
class ReminderNotificationWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val reminderDao: ReminderCacheDao,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val id = inputData.getInt(ID, 0)
        val title = inputData.getString(TITLE).orEmpty().ifBlank { "Việc chăm sóc đến hạn" }
        val body = inputData.getString(BODY).orEmpty()
        val deepLink = inputData.getString(DEEP_LINK).orEmpty()

        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) return Result.success()

        NotificationChannels.create(applicationContext)
        val destination = deepLink.takeIf { it.startsWith("agromind://") }
            ?: "agromind://crop-plan"
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(destination)
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(applicationContext, NotificationChannels.REMINDERS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        NotificationManagerCompat.from(applicationContext).notify(id, notification)
        reminderDao.markNotified(id, System.currentTimeMillis())
        return Result.success()
    }

    companion object {
        const val ID = "reminder_id"
        const val TITLE = "reminder_title"
        const val BODY = "reminder_body"
        const val DEEP_LINK = "reminder_deep_link"
    }
}

object NotificationChannels {
    const val REMINDERS = "crop_care_reminders"

    fun create(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                REMINDERS,
                "Nhắc việc chăm sóc cây",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Các bước chăm sóc và kế hoạch trồng sắp đến hạn"
            },
        )
    }
}

private fun ReminderDto.triggerInstant(): Instant? = runCatching {
    Instant.parse(triggerTime)
}.recoverCatching {
    OffsetDateTime.parse(triggerTime).toInstant()
}.getOrNull()
