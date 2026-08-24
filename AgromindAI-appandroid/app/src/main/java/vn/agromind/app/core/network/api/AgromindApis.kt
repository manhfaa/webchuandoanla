package vn.agromind.app.core.network.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.HTTP
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import vn.agromind.app.core.network.AuthInterceptor
import vn.agromind.app.core.network.dto.AccountDto
import vn.agromind.app.core.network.dto.AccountUpdateRequest
import vn.agromind.app.core.network.dto.ChangePasswordRequest
import vn.agromind.app.core.network.dto.ChatRespondRequest
import vn.agromind.app.core.network.dto.ChatRespondResponse
import vn.agromind.app.core.network.dto.CnnResultDto
import vn.agromind.app.core.network.dto.DeletionPreviewDto
import vn.agromind.app.core.network.dto.DeleteAccountRequest
import vn.agromind.app.core.network.dto.DiagnosisDto
import vn.agromind.app.core.network.dto.DiagnosisPageDto
import vn.agromind.app.core.network.dto.GoogleLoginRequest
import vn.agromind.app.core.network.dto.LoginRequest
import vn.agromind.app.core.network.dto.LogoutRequest
import vn.agromind.app.core.network.dto.MobileConfigDto
import vn.agromind.app.core.network.dto.PasswordResetConfirmRequest
import vn.agromind.app.core.network.dto.PasswordResetRequest
import vn.agromind.app.core.network.dto.PasswordResetResponse
import vn.agromind.app.core.network.dto.RefreshRequest
import vn.agromind.app.core.network.dto.RegisterRequest
import vn.agromind.app.core.network.dto.ResearchRequest
import vn.agromind.app.core.network.dto.ResearchResultDto
import vn.agromind.app.core.network.dto.ServicePlanDto
import vn.agromind.app.core.network.dto.TokenPairDto
import vn.agromind.app.core.network.dto.UsageDto
import vn.agromind.app.core.network.dto.UserSettingsDto

private const val NO_AUTH = "${AuthInterceptor.NO_AUTH}: 1"

/**
 * Everything under `/api/auth/`.
 *
 * The endpoints that establish a session carry [NO_AUTH]: sending a stale bearer
 * token to `login/` would make a fresh sign-in fail with a 401 the grower has no
 * way to act on, and sending one to `refresh/` is what an authenticator loop
 * looks like.
 */
interface AuthApi {

    @Headers(NO_AUTH)
    @POST("api/auth/login/")
    suspend fun login(@Body body: LoginRequest): TokenPairDto

    @Headers(NO_AUTH)
    @POST("api/auth/register/")
    suspend fun register(@Body body: RegisterRequest): TokenPairDto

    @Headers(NO_AUTH)
    @POST("api/auth/google/")
    suspend fun google(@Body body: GoogleLoginRequest): TokenPairDto

    @Headers(NO_AUTH)
    @POST("api/auth/refresh/")
    suspend fun refresh(@Body body: RefreshRequest): TokenPairDto

    /** Blacklists the refresh token server-side. Local teardown is not enough. */
    @POST("api/auth/logout/")
    suspend fun logout(@Body body: LogoutRequest)

    @Headers(NO_AUTH)
    @POST("api/auth/password-reset/")
    suspend fun requestPasswordReset(@Body body: PasswordResetRequest): PasswordResetResponse

    @Headers(NO_AUTH)
    @POST("api/auth/password-reset/confirm/")
    suspend fun confirmPasswordReset(@Body body: PasswordResetConfirmRequest): TokenPairDto
}

interface UserApi {

    @GET("api/users/me/")
    suspend fun me(): AccountDto

    @PATCH("api/users/me/")
    suspend fun updateMe(@Body body: AccountUpdateRequest): AccountDto

    @HTTP(method = "DELETE", path = "api/users/me/", hasBody = true)
    suspend fun deleteMe(@Body body: DeleteAccountRequest)

    @GET("api/users/me/deletion-preview/")
    suspend fun deletionPreview(): DeletionPreviewDto

    @POST("api/users/change-password/")
    suspend fun changePassword(@Body body: ChangePasswordRequest): TokenPairDto

    @GET("api/users/settings/")
    suspend fun settings(): UserSettingsDto

    @PATCH("api/users/settings/")
    suspend fun updateSettings(@Body body: UserSettingsDto): UserSettingsDto
}

interface DiagnosisApi {

    /**
     * The leaf check. Multipart, not a base64 data URL: the file is ~33% smaller
     * on the wire and the phone never has to hold a base64 copy of the photo in
     * memory next to the bitmap.
     *
     * `client_request_id` is required by the server. It is what makes a retry
     * after a dropped connection return the first answer instead of running the
     * model — and later charging quota — a second time.
     */
    @Multipart
    @POST("api/diagnoses/cnn-multipart/")
    suspend fun classify(
        @Part image: MultipartBody.Part,
        @Part("client_request_id") clientRequestId: RequestBody,
        @Part("input_method") inputMethod: RequestBody,
    ): CnnResultDto

    @POST("api/diagnoses/research-symptoms/")
    suspend fun researchSymptoms(@Body body: ResearchRequest): ResearchResultDto

    @GET("api/diagnoses/")
    suspend fun history(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): DiagnosisPageDto

    @POST("api/diagnoses/")
    suspend fun save(@Body body: Map<String, @JvmSuppressWildcards Any?>): DiagnosisDto

    @GET("api/diagnoses/{id}/")
    suspend fun detail(@Path("id") id: Int): DiagnosisDto

    @DELETE("api/diagnoses/{id}/")
    suspend fun delete(@Path("id") id: Int)

    @GET("api/diagnoses/usage/")
    suspend fun usage(): UsageDto
}

interface ChatApi {

    @POST("api/engagement/chat/respond/")
    suspend fun respond(@Body body: ChatRespondRequest): ChatRespondResponse

    @GET("api/engagement/plans/")
    suspend fun plans(): List<ServicePlanDto>
}

interface ConfigApi {

    /** Public. Read before the first screen, so it must not need a token. */
    @Headers(NO_AUTH)
    @GET("api/mobile/config/")
    suspend fun mobileConfig(): MobileConfigDto
}
