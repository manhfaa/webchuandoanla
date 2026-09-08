package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire shapes for the `/api/auth/` routes, exactly as Django writes them.
 *
 * (Kotlin block comments nest, so a literal `/` followed by an asterisk inside
 * a KDoc opens a comment that never closes. Route globs are spelled out here.)
 *
 * These stay separate from the domain models on purpose: `snake_case` and
 * nullability belong to the transport, and a rename on the server should break
 * one file rather than every screen.
 */

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("accepted_terms") val acceptedTerms: Boolean,
)

/**
 * The Google ID token, forwarded untouched.
 *
 * The app never decodes it and never sends the email or the profile alongside
 * it. Django verifies the signature, the issuer, the audience and the expiry
 * itself — anything the client claimed about the user would be unverifiable.
 */
@Serializable
data class GoogleLoginRequest(
    val credential: String,
    @SerialName("accepted_terms") val acceptedTerms: Boolean,
)

@Serializable
data class RefreshRequest(val refresh: String)

@Serializable
data class LogoutRequest(val refresh: String)

@Serializable
data class TokenPairDto(
    val access: String,
    /** Present when the server rotated; absent when it did not. */
    val refresh: String? = null,
    val user: AccountDto? = null,
)

@Serializable
data class PasswordResetRequest(val email: String)

@Serializable
data class PasswordResetResponse(
    val detail: String = "",
    /**
     * False when the deployment has no mail provider configured. The screen must
     * then say so plainly instead of claiming an email is on its way — a grower
     * waiting for a message that will never arrive is worse off than one told to
     * contact support.
     */
    @SerialName("delivery_enabled") val deliveryEnabled: Boolean = false,
)

@Serializable
data class PasswordResetConfirmRequest(
    val token: String,
    @SerialName("new_password") val newPassword: String,
)

@Serializable
data class ChangePasswordRequest(
    @SerialName("current_password") val currentPassword: String? = null,
    @SerialName("new_password") val newPassword: String,
)
