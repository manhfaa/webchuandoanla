package vn.agromind.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.AgromindTheme
import vn.agromind.app.core.navigation.AgromindNavHost

/**
 * The only Activity.
 *
 * Single-activity because the session, the navigation stack and the in-progress
 * diagnosis draft all outlive any one screen. Splitting them across activities
 * would mean rebuilding that state at every transition for no benefit.
 *
 * The splash is a Compose destination rather than the platform splash-screen
 * API, because `design/SCREEN-SPECS.md` gives it real content — wordmark,
 * tagline and the line "Đang mở lại phiên làm việc…" — and it must stay visible
 * for exactly as long as the encrypted session takes to decrypt. No decorative
 * delay, and no flash of the login screen for someone already signed in.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        viewModel.onDeepLink(intent?.data)

        setContent {
            val ui by viewModel.uiState.collectAsStateWithLifecycle()

            AgromindTheme(
                preference = ui.themePreference,
                reduceMotion = ui.reduceMotion,
            ) {
                Surface(color = AgroTheme.colors.canvas) {
                    AgromindNavHost(
                        navController = rememberNavController(),
                        session = ui.session,
                        config = ui.config,
                        onboardingSeen = ui.onboardingSeen,
                        pendingDeepLink = ui.pendingDeepLink,
                        onDeepLinkConsumed = viewModel::onDeepLinkConsumed,
                        onOnboardingFinished = viewModel::completeOnboarding,
                        offlineState = ui.offlineState,
                    )
                }
            }
        }
    }

    /**
     * `launchMode="singleTask"`, so a link tapped while the app is already open
     * arrives here rather than in a new instance. Without this, the password
     * reset link from an email would open the app on whatever screen it was last
     * showing.
     */
    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        viewModel.onDeepLink(intent.data)
    }
}
