package vn.agromind.app.core.config

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import vn.agromind.app.BuildConfig
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.ConfigApi
import vn.agromind.app.core.network.dto.MobileConfigDto
import javax.inject.Inject
import javax.inject.Singleton

/**
 * What the server says this build is allowed to do.
 *
 * Two of these flags are load-bearing rather than cosmetic:
 *
 * * `playBilling` — the Play build hides its purchase CTA until the server can
 *   actually verify a purchase. Showing a bank transfer instead would be a Play
 *   policy violation, so the fallback is "đang được hoàn thiện", not SePay.
 * * `passwordResetEmail` — when the deployment has no mail provider, the forgot-
 *   password screen says so instead of claiming a message is on its way.
 *
 * Defaults are conservative: before the first successful fetch every optional
 * feature is off. A screen that briefly hides a working feature is recoverable;
 * one that offers a feature the server cannot deliver is a dead end.
 */
@Singleton
class AppConfigRepository @Inject constructor(
    private val api: ConfigApi,
) {

    private val _config = MutableStateFlow(AppConfig.conservative())
    val config: StateFlow<AppConfig> = _config.asStateFlow()

    suspend fun refresh() {
        val result = ErrorMapper.guard { api.mobileConfig() }
        result.valueOrNull?.let { _config.value = AppConfig.from(it) }
        // A failure leaves the previous value in place. Losing config is not a
        // reason to sign anyone out or to show a maintenance screen; the calls
        // themselves will report their own errors when they are made.
    }
}

data class AppConfig(
    val googleSignIn: Boolean,
    val symptomResearch: Boolean,
    val expertChat: Boolean,
    val directPayment: Boolean,
    val playBilling: Boolean,
    val passwordResetEmail: Boolean,
    val maintenance: Boolean,
    val maintenanceMessage: String,
    val updateRequired: Boolean,
    val termsUrl: String,
    val privacyUrl: String,
    val supportUrl: String,
) {
    /** Whether this build may show a purchase CTA at all. */
    val canPurchase: Boolean
        get() = if (BuildConfig.PLAY_BILLING_ENABLED) playBilling else BuildConfig.SEPAY_ENABLED && directPayment

    companion object {
        fun conservative() = AppConfig(
            googleSignIn = false,
            symptomResearch = false,
            expertChat = false,
            directPayment = false,
            playBilling = false,
            passwordResetEmail = false,
            maintenance = false,
            maintenanceMessage = "",
            updateRequired = false,
            termsUrl = "${BuildConfig.WEBSITE_URL}/terms",
            privacyUrl = "${BuildConfig.WEBSITE_URL}/privacy",
            supportUrl = "",
        )

        fun from(dto: MobileConfigDto) = AppConfig(
            googleSignIn = dto.features.googleSignIn && BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank(),
            symptomResearch = dto.features.symptomResearch,
            expertChat = dto.features.expertChat,
            directPayment = dto.features.directPayment,
            playBilling = dto.features.playBilling,
            passwordResetEmail = dto.features.passwordResetEmail,
            maintenance = dto.maintenance,
            maintenanceMessage = dto.maintenanceMessage,
            updateRequired = BuildConfig.VERSION_CODE < dto.minimumSupportedVersion,
            termsUrl = dto.legal.termsUrl.ifBlank { "${BuildConfig.WEBSITE_URL}/terms" },
            privacyUrl = dto.legal.privacyUrl.ifBlank { "${BuildConfig.WEBSITE_URL}/privacy" },
            supportUrl = dto.legal.supportUrl,
        )
    }
}
