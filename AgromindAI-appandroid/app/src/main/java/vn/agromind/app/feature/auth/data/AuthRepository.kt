package vn.agromind.app.feature.auth.data

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.AuthApi
import vn.agromind.app.core.network.api.UserApi
import vn.agromind.app.core.network.dto.AccountDto
import vn.agromind.app.core.network.dto.ChangePasswordRequest
import vn.agromind.app.core.network.dto.DeleteAccountRequest
import vn.agromind.app.core.network.dto.DeletionPreviewDto
import vn.agromind.app.core.network.dto.GoogleLoginRequest
import vn.agromind.app.core.network.dto.LoginRequest
import vn.agromind.app.core.network.dto.LogoutRequest
import vn.agromind.app.core.network.dto.PasswordResetConfirmRequest
import vn.agromind.app.core.network.dto.PasswordResetRequest
import vn.agromind.app.core.network.dto.RegisterRequest
import vn.agromind.app.core.network.dto.TokenPairDto
import vn.agromind.app.core.security.SecureTokenStore
import vn.agromind.app.core.security.SessionManager
import vn.agromind.app.core.security.SessionTokens
import vn.agromind.app.core.settings.LocalPreferences
import vn.agromind.app.core.reminders.ReminderScheduler
import javax.inject.Inject
import javax.inject.Singleton

/** What the forgot-password screen needs to know before it says anything. */
data class ResetRequestOutcome(val message: String, val deliveryEnabled: Boolean)

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val userApi: UserApi,
    private val session: SessionManager,
    private val tokenStore: SecureTokenStore,
    private val preferences: LocalPreferences,
    @ApplicationContext private val context: Context,
) {

    suspend fun login(email: String, password: String): AgroResult<AccountDto?> =
        ErrorMapper.guard { authApi.login(LoginRequest(email.trim(), password)) }
            .also { it.valueOrNull?.let { pair -> establish(pair) } }
            .let { result ->
                when (result) {
                    is AgroResult.Ok -> AgroResult.Ok(result.value.user)
                    is AgroResult.Err -> AgroResult.Err(result.error.asSignInError())
                }
            }

    suspend fun register(
        email: String,
        password: String,
        fullName: String,
        acceptedTerms: Boolean,
    ): AgroResult<AccountDto?> =
        ErrorMapper.guard {
            authApi.register(
                RegisterRequest(
                    email = email.trim(),
                    password = password,
                    fullName = fullName.trim().ifBlank { null },
                    acceptedTerms = acceptedTerms,
                ),
            )
        }
            .also { it.valueOrNull?.let { pair -> establish(pair) } }
            .let { result ->
                when (result) {
                    is AgroResult.Ok -> AgroResult.Ok(result.value.user)
                    is AgroResult.Err -> AgroResult.Err(result.error)
                }
            }

    /**
     * Hands the Google ID token to Django and lets it decide who this is.
     *
     * The app deliberately does not read the token, and does not send the email
     * or the display name alongside it. Both are inside the signed JWT, and
     * anything the client asserted separately would be unverifiable — so
     * accepting it would mean trusting the client about who is signing in.
     */
    suspend fun signInWithGoogle(idToken: String, acceptedTerms: Boolean): AgroResult<AccountDto?> =
        ErrorMapper.guard { authApi.google(GoogleLoginRequest(idToken, acceptedTerms)) }
            .also { it.valueOrNull?.let { pair -> establish(pair) } }
            .let { result ->
                when (result) {
                    is AgroResult.Ok -> AgroResult.Ok(result.value.user)
                    is AgroResult.Err -> AgroResult.Err(result.error)
                }
            }

    suspend fun requestPasswordReset(email: String): AgroResult<ResetRequestOutcome> =
        ErrorMapper.guard { authApi.requestPasswordReset(PasswordResetRequest(email.trim())) }
            .let { result ->
                when (result) {
                    is AgroResult.Ok -> AgroResult.Ok(
                        ResetRequestOutcome(
                            message = result.value.detail,
                            // The screen must not claim an email was sent when
                            // the deployment has no mail provider. Waiting for a
                            // message that will never arrive is worse than being
                            // told to contact support.
                            deliveryEnabled = result.value.deliveryEnabled,
                        ),
                    )
                    is AgroResult.Err -> AgroResult.Err(result.error)
                }
            }

    suspend fun confirmPasswordReset(token: String, newPassword: String): AgroResult<Unit> =
        ErrorMapper.guard { authApi.confirmPasswordReset(PasswordResetConfirmRequest(token, newPassword)) }
            .also { it.valueOrNull?.let { pair -> establish(pair) } }
            .let { if (it is AgroResult.Err) it else AgroResult.Ok(Unit) }

    suspend fun me(): AgroResult<AccountDto> = ErrorMapper.guard { userApi.me() }

    suspend fun changePassword(currentPassword: String?, newPassword: String): AgroResult<Unit> =
        ErrorMapper.guard {
            userApi.changePassword(ChangePasswordRequest(currentPassword, newPassword))
        }.also { it.valueOrNull?.let { pair -> establish(pair) } }
            .let { if (it is AgroResult.Err) it else AgroResult.Ok(Unit) }

    suspend fun deletionPreview(): AgroResult<DeletionPreviewDto> =
        ErrorMapper.guard { userApi.deletionPreview() }

    suspend fun deleteAccount(password: String?, confirmText: String): AgroResult<Unit> {
        val result = ErrorMapper.guard {
            userApi.deleteMe(DeleteAccountRequest(password, confirmText))
        }
        if (result is AgroResult.Ok) {
            session.signOut()
            preferences.clearPersonal()
            ReminderScheduler.stop(context)
        }
        return if (result is AgroResult.Err) result else AgroResult.Ok(Unit)
    }

    /**
     * Signing out is two things, and only one of them is local.
     *
     * The refresh token must be blacklisted server-side, or a copy taken off the
     * device stays valid for a week after the grower thought they had signed
     * out. The local wipe happens regardless of whether that call succeeds —
     * failing to reach the server is not a reason to leave a session on a phone
     * someone is about to hand over or sell.
     */
    suspend fun logout() {
        val refresh = tokenStore.read()?.refresh
        if (refresh != null) {
            ErrorMapper.guard { authApi.logout(LogoutRequest(refresh)) }
        }
        session.signOut()
        preferences.clearPersonal()
        ReminderScheduler.stop(context)
    }

    private suspend fun establish(pair: TokenPairDto) {
        session.signIn(
            SessionTokens(
                access = pair.access,
                refresh = pair.refresh.orEmpty(),
            ),
        )
        ReminderScheduler.start(context)
    }

    /**
     * A 401 on the sign-in call means the credentials were wrong, not that a
     * session expired — showing "phiên đăng nhập đã hết hạn" to someone who is
     * trying to sign in reads as a bug and tells them nothing.
     */
    private fun AgroError.asSignInError(): AgroError = when (this) {
        is AgroError.SessionExpired -> AgroError.Validation(
            message = "Email hoặc mật khẩu chưa đúng. Bạn thử lại giúp mình nhé.",
            fields = mapOf("password" to "Email hoặc mật khẩu chưa đúng."),
        )
        else -> this
    }
}
