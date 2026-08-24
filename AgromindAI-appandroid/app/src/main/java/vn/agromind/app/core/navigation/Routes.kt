package vn.agromind.app.core.navigation

import android.net.Uri

/**
 * Every destination, as a string route.
 *
 * Ids only. A route never carries an object — a leaf photo, a CNN payload or a
 * draft would then live in the back stack, be saved into the process-restore
 * bundle and blow the 1 MB `TransactionTooLarge` limit. Screens re-read what they
 * need from Room or from the repository by id.
 */
object Route {
    const val Splash = "splash"
    const val Onboarding = "onboarding"

    const val Login = "auth/login"
    const val Register = "auth/register"
    const val ForgotPassword = "auth/forgot"
    const val ResetPassword = "auth/reset/{token}"
    fun resetPassword(token: String) = "auth/reset/${Uri.encode(token)}"

    const val Maintenance = "maintenance"
    const val UpdateRequired = "update-required"

    /** Bottom-navigation destinations. Order is fixed; see INFORMATION-ARCHITECTURE. */
    const val Today = "today"
    const val History = "history"
    const val Check = "check"
    const val Garden = "garden"
    const val More = "more"

    const val DiagnosisResult = "diagnosis/{id}"
    fun diagnosisResult(id: Int) = "diagnosis/$id"

    const val PlotJournal = "plot/{id}"
    fun plotJournal(id: Int) = "plot/$id"

    const val OrderStatus = "order/{id}"
    fun orderStatus(id: String) = "order/${Uri.encode(id)}"

    const val ChatChooser = "chat"
    const val ChatConversation = "chat/{mode}?diagnosis={diagnosis}"
    fun chatConversation(mode: String, diagnosisId: Int? = null) =
        "chat/$mode?diagnosis=${diagnosisId ?: -1}"

    const val Plans = "plans"
    const val Profile = "profile"
    const val ChangePassword = "profile/change-password"
    const val DeleteAccount = "profile/delete-account"
    const val Traceability = "traceability"

    const val PlotForm = "plot/new"
    const val Weather = "weather"
    const val Library = "library"

    const val CropPlans = "crop-plans"
    const val CropPlanWizard = "crop-plans/new"
    const val CropPlanDetail = "crop-plans/{id}"
    fun cropPlanDetail(id: Int) = "crop-plans/$id"

    /** The purchase flow. Which one it is depends on the build flavour. */
    const val Checkout = "checkout/{plan}"
    fun checkout(planSlug: String) = "checkout/${Uri.encode(planSlug)}"
}

/**
 * A link that arrived from outside the app.
 *
 * Parsed into a small closed set rather than passed around as a `Uri`, because
 * a `Uri` from an email or a notification is untrusted input and the only thing
 * the app should take from it is "which screen, which id".
 */
sealed interface DeepLink {
    data class Diagnosis(val id: Int) : DeepLink
    data class Plot(val id: Int) : DeepLink
    data class Order(val id: String) : DeepLink
    data class PasswordReset(val token: String) : DeepLink
    data class CropPlan(val id: Int?) : DeepLink

    /** Where this link wants to go, once there is a session. */
    fun route(): String = when (this) {
        is Diagnosis -> Route.diagnosisResult(id)
        is Plot -> Route.plotJournal(id)
        is Order -> Route.orderStatus(id)
        is PasswordReset -> Route.resetPassword(token)
        is CropPlan -> id?.let(Route::cropPlanDetail) ?: Route.CropPlans
    }

    /** True for links that are meaningful *before* signing in. */
    val worksSignedOut: Boolean get() = this is PasswordReset

    companion object {
        fun parse(uri: Uri?): DeepLink? {
            if (uri == null) return null
            return when (uri.scheme) {
                "agromind" -> when (uri.host) {
                    "diagnosis" -> uri.lastPathSegment?.toIntOrNull()?.let(::Diagnosis)
                    "plot" -> uri.lastPathSegment?.toIntOrNull()?.let(::Plot)
                    "order" -> uri.lastPathSegment?.let(::Order)
                    "crop-plan", "crop-plans" -> CropPlan(uri.lastPathSegment?.toIntOrNull())
                    else -> null
                }
                "https" -> when {
                    uri.path?.startsWith("/reset-password") == true ->
                        uri.getQueryParameter("token")?.takeIf { it.isNotBlank() }?.let(::PasswordReset)
                    else -> null
                }
                else -> null
            }
        }
    }
}
