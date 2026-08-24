package vn.agromind.app.core.network

import okhttp3.Interceptor
import okhttp3.Response
import vn.agromind.app.BuildConfig
import vn.agromind.app.core.security.SessionManager
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Adds the bearer token and the two headers support needs to trace a request.
 *
 * `X-Request-ID` is generated per attempt and echoed by Django, which is what
 * makes a grower's "nó báo lỗi lúc 9 giờ sáng" findable in the server log
 * without anyone logging the body of a request that contains a leaf photo.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val session: SessionManager,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val builder = chain.request().newBuilder()
            .header("X-Agromind-App-Version", "${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}")
            .header("X-Agromind-Distribution", BuildConfig.DISTRIBUTION)
            .header("X-Request-ID", UUID.randomUUID().toString())
            .header("Accept", "application/json")

        // Public endpoints (login, register, refresh, mobile config) must go out
        // without a token: sending an expired one to /api/auth/login/ would turn
        // a sign-in into a 401 for reasons the grower cannot act on.
        if (chain.request().header(NO_AUTH) == null) {
            session.currentAccess()?.let { builder.header("Authorization", "Bearer $it") }
        }
        builder.removeHeader(NO_AUTH)

        return chain.proceed(builder.build())
    }

    companion object {
        /** Marker header; stripped before the request leaves. */
        const val NO_AUTH = "X-Agromind-No-Auth"
    }
}
