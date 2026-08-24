package vn.agromind.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import vn.agromind.app.core.reminders.NotificationChannels
import javax.inject.Inject

@HiltAndroidApp
class AgromindApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    /**
     * WorkManager is initialised on demand rather than by its startup provider
     * (removed in the manifest), so an app launch that never syncs anything does
     * not pay for it. The factory is Hilt's so workers can be constructor-injected.
     */
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        NotificationChannels.create(this)
    }
}
