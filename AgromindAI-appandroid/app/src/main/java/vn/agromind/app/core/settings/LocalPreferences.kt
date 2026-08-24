package vn.agromind.app.core.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import vn.agromind.app.core.designsystem.ThemePreference
import javax.inject.Inject
import javax.inject.Singleton

private val Context.prefs by preferencesDataStore(name = "agromind_prefs")

/** Display choices from Hồ sơ → Cài đặt. */
data class DisplayPreferences(
    val theme: ThemePreference = ThemePreference.System,
    val reduceMotion: Boolean = false,
    val autoSaveSymptomDraft: Boolean = true,
    val onboardingSeen: Boolean = false,
)

/**
 * Preferences that are not sensitive, so plain DataStore is right for them.
 *
 * Nothing here is a credential and nothing here identifies the grower. Tokens
 * live in `SecureTokenStore`, behind a Keystore key; putting them alongside a
 * theme choice would be the mistake this separation exists to prevent.
 */
@Singleton
class LocalPreferences @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    val display: Flow<DisplayPreferences> = context.prefs.data.map { p ->
        DisplayPreferences(
            theme = when (p[THEME]) {
                "light" -> ThemePreference.Light
                "dark" -> ThemePreference.Dark
                else -> ThemePreference.System
            },
            reduceMotion = p[REDUCE_MOTION] ?: false,
            autoSaveSymptomDraft = p[AUTO_SAVE_DRAFT] ?: true,
            onboardingSeen = p[ONBOARDING_SEEN] ?: false,
        )
    }

    suspend fun setTheme(preference: ThemePreference) {
        context.prefs.edit {
            it[THEME] = when (preference) {
                ThemePreference.Light -> "light"
                ThemePreference.Dark -> "dark"
                ThemePreference.System -> "system"
            }
        }
    }

    suspend fun setReduceMotion(enabled: Boolean) {
        context.prefs.edit { it[REDUCE_MOTION] = enabled }
    }

    suspend fun setAutoSaveSymptomDraft(enabled: Boolean) {
        context.prefs.edit { it[AUTO_SAVE_DRAFT] = enabled }
    }

    suspend fun markOnboardingSeen() {
        context.prefs.edit { it[ONBOARDING_SEEN] = true }
    }

    /** Called on sign-out and on account deletion, together with the cache wipe. */
    suspend fun clearPersonal() {
        context.prefs.edit {
            it.remove(AUTO_SAVE_DRAFT)
            // Theme, reduce-motion and onboarding are about this device, not
            // this account, so they survive a sign-out on purpose.
        }
    }

    private companion object {
        val THEME = stringPreferencesKey("display_theme")
        val REDUCE_MOTION = booleanPreferencesKey("reduce_motion")
        val AUTO_SAVE_DRAFT = booleanPreferencesKey("auto_save_symptom_draft")
        val ONBOARDING_SEEN = booleanPreferencesKey("onboarding_seen")
    }
}
