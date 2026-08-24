package vn.agromind.app.core.network.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import vn.agromind.app.BuildConfig
import vn.agromind.app.core.network.AuthInterceptor
import vn.agromind.app.core.network.TokenAuthenticator
import vn.agromind.app.core.network.api.AuthApi
import vn.agromind.app.core.network.api.ChatApi
import vn.agromind.app.core.network.api.ConfigApi
import vn.agromind.app.core.network.api.CropPlanApi
import vn.agromind.app.core.network.api.DiagnosisApi
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.api.PaymentApi
import vn.agromind.app.core.network.api.UserApi
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * The plain client: bearer header, timeouts, no 401 handling.
 *
 * Also the client a session refresh goes out on. Refreshing through the
 * authenticated client would mean a failing refresh triggers another refresh.
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class RefreshClient

/** The client that carries inference and research calls, with a long read timeout. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class LongRunningClient

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun json(): Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }

    /**
     * Base client. Everything else is built from it with `newBuilder()`, so the
     * connection pool and the dispatcher are shared rather than duplicated.
     *
     * There is intentionally **no** body logging, in any build. A request body
     * here can be a leaf photo, a symptom description or a bank reference, and a
     * response body can be a session token. `HttpLoggingInterceptor` at BASIC
     * with `Authorization` redacted gives enough to debug routing without any of
     * that reaching logcat.
     */
    @Provides
    @Singleton
    @RefreshClient
    fun baseClient(authInterceptor: AuthInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(60, TimeUnit.SECONDS)
            // OkHttp's own retry, limited to connection-level failures on
            // idempotent requests. POSTs that spend quota are never replayed
            // here; the server's client_request_id is what makes those safe.
            .retryOnConnectionFailure(true)
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.VERBOSE_NETWORK_LOG) {
                    addInterceptor(
                        okhttp3.logging.HttpLoggingInterceptor().apply {
                            level = okhttp3.logging.HttpLoggingInterceptor.Level.BASIC
                            redactHeader("Authorization")
                            redactHeader("Cookie")
                        },
                    )
                }
            }
            .build()

    /** The default client for every authenticated call: adds the 401 → refresh → retry-once path. */
    @Provides
    @Singleton
    fun authenticatedClient(
        @RefreshClient base: OkHttpClient,
        authenticator: TokenAuthenticator,
    ): OkHttpClient = base.newBuilder().authenticator(authenticator).build()

    /**
     * Inference and the seven-stage research run are slow by nature: a cold
     * Hugging Face Space plus two Tavily searches and five DeepSeek calls can
     * legitimately take a minute and a half. A 30-second read timeout would
     * abandon work the grower has already been charged for, so this client waits
     * — and the screens that use it always show a real cancel button rather than
     * a spinner with no way out.
     */
    @Provides
    @Singleton
    @LongRunningClient
    fun longRunningClient(
        authenticated: OkHttpClient,
    ): OkHttpClient = authenticated.newBuilder()
        .readTimeout(120, TimeUnit.SECONDS)
        .callTimeout(150, TimeUnit.SECONDS)
        .build()

    private fun retrofit(client: OkHttpClient, json: Json): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    @Provides
    @Singleton
    fun authApi(@RefreshClient client: OkHttpClient, json: Json): AuthApi =
        retrofit(client, json).create(AuthApi::class.java)

    @Provides
    @Singleton
    fun userApi(client: OkHttpClient, json: Json): UserApi =
        retrofit(client, json).create(UserApi::class.java)

    @Provides
    @Singleton
    fun diagnosisApi(@LongRunningClient client: OkHttpClient, json: Json): DiagnosisApi =
        retrofit(client, json).create(DiagnosisApi::class.java)

    @Provides
    @Singleton
    fun chatApi(@LongRunningClient client: OkHttpClient, json: Json): ChatApi =
        retrofit(client, json).create(ChatApi::class.java)

    @Provides
    @Singleton
    fun configApi(@RefreshClient client: OkHttpClient, json: Json): ConfigApi =
        retrofit(client, json).create(ConfigApi::class.java)

    @Provides
    @Singleton
    fun farmApi(client: OkHttpClient, json: Json): FarmApi =
        retrofit(client, json).create(FarmApi::class.java)

    /**
     * The crop planner runs a weather fetch plus a generation pass, so it lives
     * on the long-timeout client for the same reason inference does.
     */
    @Provides
    @Singleton
    fun cropPlanApi(@LongRunningClient client: OkHttpClient, json: Json): CropPlanApi =
        retrofit(client, json).create(CropPlanApi::class.java)

    @Provides
    @Singleton
    fun paymentApi(client: OkHttpClient, json: Json): PaymentApi =
        retrofit(client, json).create(PaymentApi::class.java)
}
