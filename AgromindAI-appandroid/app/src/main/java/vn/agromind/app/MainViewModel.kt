package vn.agromind.app

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import vn.agromind.app.core.config.AppConfig
import vn.agromind.app.core.config.AppConfigRepository
import vn.agromind.app.core.designsystem.ThemePreference
import vn.agromind.app.core.navigation.DeepLink
import vn.agromind.app.core.designsystem.components.OfflineState
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.network.ConnectivityObserver
import vn.agromind.app.core.security.SessionManager
import vn.agromind.app.core.security.SessionState
import vn.agromind.app.core.settings.LocalPreferences
import vn.agromind.app.core.reminders.ReminderScheduler
import javax.inject.Inject

data class MainUiState(
    val session: SessionState = SessionState.Loading,
    val config: AppConfig = AppConfig.conservative(),
    val themePreference: ThemePreference = ThemePreference.System,
    val reduceMotion: Boolean = false,
    val onboardingSeen: Boolean = false,
    val offlineState: OfflineState = OfflineState.Online,
    /**
     * A link that arrived before the app knew who was signed in.
     *
     * Held rather than dropped: a grower who taps `agromind://diagnosis/482`
     * from a notification while signed out should land on that result after
     * logging in, not on a generic home screen with no idea what happened.
     */
    val pendingDeepLink: DeepLink? = null,
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val session: SessionManager,
    private val appConfig: AppConfigRepository,
    private val preferences: LocalPreferences,
    connectivity: ConnectivityObserver,
    cache: OfflineCache,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val pendingDeepLink = MutableStateFlow<DeepLink?>(null)

    private val baseState = combine(
        session.state,
        appConfig.config,
        preferences.display,
        pendingDeepLink,
    ) { sessionState, config, display, deepLink ->
        MainUiState(
            session = sessionState,
            config = config,
            themePreference = display.theme,
            reduceMotion = display.reduceMotion,
            onboardingSeen = display.onboardingSeen,
            pendingDeepLink = deepLink,
        )
    }

    val uiState: StateFlow<MainUiState> = combine(
        baseState,
        connectivity.isOnline,
        cache.hasData,
    ) { base, online, hasCache ->
        base.copy(offlineState = if (online) OfflineState.Online else OfflineState.Offline(hasCache))
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MainUiState())

    init {
        viewModelScope.launch {
            // Decrypting the stored session is what the splash is waiting on;
            // the config fetch is not, so it runs alongside and its result is
            // simply picked up when it lands.
            session.hydrate()
        }
        viewModelScope.launch { appConfig.refresh() }
        viewModelScope.launch {
            session.state.collect { state ->
                when (state) {
                    is SessionState.SignedIn -> ReminderScheduler.start(context)
                    is SessionState.SignedOut, is SessionState.Expired -> ReminderScheduler.stop(context)
                    SessionState.Loading -> Unit
                }
            }
        }
    }

    fun onDeepLink(uri: Uri?) {
        DeepLink.parse(uri)?.let { pendingDeepLink.value = it }
    }

    fun onDeepLinkConsumed() {
        pendingDeepLink.value = null
    }

    fun completeOnboarding() {
        viewModelScope.launch { preferences.markOnboardingSeen() }
    }
}
