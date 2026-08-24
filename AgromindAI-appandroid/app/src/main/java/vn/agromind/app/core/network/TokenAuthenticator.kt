package vn.agromind.app.core.network

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import vn.agromind.app.core.network.api.AuthApi
import vn.agromind.app.core.network.dto.RefreshRequest
import vn.agromind.app.core.security.RefreshOutcome
import vn.agromind.app.core.security.SessionManager
import vn.agromind.app.core.security.SessionTokens
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * Renews the session when a request comes back 401, then replays it once.
 *
 * An OkHttp `Authenticator` is the right place for this rather than an
 * interceptor: OkHttp calls it after a 401, on the same connection, and gives us
 * the request that failed — including which access token it carried, which is
 * what lets [SessionManager.refreshOnce] tell "my token is stale" apart from
 * "someone already fixed this".
 *
 * `runBlocking` is correct here and not a shortcut: `authenticate` is a blocking
 * callback on OkHttp's own thread, and the work it waits on is the single
 * refresh every other 401'd request is also waiting on.
 *
 * [refreshApi] arrives as a `Provider` and is built on a client with **no**
 * authenticator attached. Refreshing through this same authenticator would make
 * a failing refresh trigger another refresh, forever.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val session: SessionManager,
    private val refreshApi: Provider<AuthApi>,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Exactly one retry. Beyond that the token is not the problem, and
        // returning a request again would loop until OkHttp gives up.
        if (response.priorResponse != null) return null
        if (response.request.header(AuthInterceptor.NO_AUTH) != null) return null

        val staleAccess = response.request.header("Authorization")?.removePrefix("Bearer ")?.trim()

        val outcome = runBlocking {
            session.refreshOnce(staleAccess) { refresh ->
                runCatching {
                    val body = refreshApi.get().refresh(RefreshRequest(refresh))
                    SessionTokens(
                        access = body.access,
                        // Django rotates: when a new refresh token comes back the
                        // old one is already blacklisted, so keeping it would be
                        // keeping something that can no longer be used.
                        refresh = body.refresh?.takeIf { it.isNotBlank() } ?: refresh,
                    )
                }.getOrNull()
            }
        }

        val access = when (outcome) {
            is RefreshOutcome.Renewed -> outcome.access
            is RefreshOutcome.AlreadyFresh -> outcome.access
            RefreshOutcome.Failed -> return null
        }

        return response.request.newBuilder()
            .header("Authorization", "Bearer $access")
            .build()
    }
}
