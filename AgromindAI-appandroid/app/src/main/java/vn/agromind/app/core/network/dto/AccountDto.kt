package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AccountDto(
    val id: Int,
    val username: String = "",
    val email: String = "",
    @SerialName("full_name") val fullName: String = "",
    val phone: String = "",
    @SerialName("avatar_url") val avatarUrl: String = "",
    @SerialName("company_name") val companyName: String = "",
    @SerialName("farm_name") val farmName: String = "",
    val location: String = "",
    @SerialName("current_plan") val currentPlan: String = "seed",
    @SerialName("plan_expires_at") val planExpiresAt: String? = null,
    @SerialName("terms_accepted_at") val termsAcceptedAt: String? = null,
    @SerialName("terms_version") val termsVersion: String = "",
    /**
     * False for an account created through Google. The change-password screen
     * uses this to drop the "mật khẩu hiện tại" field, which such an account has
     * never had and cannot supply.
     */
    @SerialName("has_usable_password") val hasUsablePassword: Boolean = true,
)

@Serializable
data class AccountUpdateRequest(
    @SerialName("full_name") val fullName: String? = null,
    val phone: String? = null,
    @SerialName("farm_name") val farmName: String? = null,
    val location: String? = null,
)

@Serializable
data class DeletionPreviewDto(
    @SerialName("diagnoses") val diagnoses: Int = 0,
    @SerialName("farm_plots") val farmPlots: Int = 0,
    @SerialName("cultivation_logs") val cultivationLogs: Int = 0,
    @SerialName("crop_plans") val cropPlans: Int = 0,
    /** The exact string the grower must type. Never invented on the client. */
    @SerialName("confirm_phrase") val confirmationPhrase: String = "",
)

@Serializable
data class DeleteAccountRequest(
    val password: String? = null,
    @SerialName("confirm_text") val confirmText: String,
)

@Serializable
data class UserSettingsDto(
    val theme: String = "system",
    val language: String = "vi",
    @SerialName("notifications_enabled") val notificationsEnabled: Boolean = true,
    @SerialName("email_notifications") val emailNotifications: Boolean = false,
    @SerialName("auto_save_drafts") val autoSaveDrafts: Boolean = true,
    val timezone: String = "Asia/Ho_Chi_Minh",
)

@Serializable
data class MobileConfigDto(
    @SerialName("minimum_supported_version") val minimumSupportedVersion: Int = 1,
    @SerialName("latest_version") val latestVersion: Int = 1,
    val maintenance: Boolean = false,
    @SerialName("maintenance_message") val maintenanceMessage: String = "",
    val features: FeatureFlagsDto = FeatureFlagsDto(),
    val legal: LegalLinksDto = LegalLinksDto(),
)

@Serializable
data class FeatureFlagsDto(
    @SerialName("symptom_research") val symptomResearch: Boolean = false,
    @SerialName("expert_chat") val expertChat: Boolean = false,
    @SerialName("direct_payment") val directPayment: Boolean = false,
    @SerialName("play_billing") val playBilling: Boolean = false,
    @SerialName("password_reset_email") val passwordResetEmail: Boolean = false,
)

@Serializable
data class LegalLinksDto(
    @SerialName("terms_url") val termsUrl: String = "",
    @SerialName("privacy_url") val privacyUrl: String = "",
    @SerialName("support_url") val supportUrl: String = "",
)
