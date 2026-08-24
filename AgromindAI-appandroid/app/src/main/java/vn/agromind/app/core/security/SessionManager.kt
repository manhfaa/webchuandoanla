package vn.agromind.app.core.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/** What the app knows about the signed-in state, before any screen renders. */
sealed interface SessionState {
    /** Still reading the encrypted blob. The splash waits on exactly this. */
    data object Loading : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val tokens: SessionTokens) : SessionState

    /**
     * Was signed in, refresh failed. Distinct from [SignedOut] because the app
     * owes the grower an explanation and should return them to where they were
     * once they sign in again.
     */
    data object Expired : SessionState
}

/** How a refresh went, for the caller that triggered it. */
sealed interface RefreshOutcome {
    data class Renewed(val access: String) : RefreshOutcome
    /** Someone else refreshed while we waited; use theirs. */
    data class AlreadyFresh(val access: String) : RefreshOutcome
    data object Failed : RefreshOutcome
}

/**
 * The single owner of the token pair.
 *
 * Django rotates refresh tokens and blacklists the one it replaces
 * (`ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`). Two consequences drive
 * everything here:
 *
 * 1. **The pair must be replaced together, atomically.** Storing the new access
 *    token but losing the new refresh token leaves the app holding a blacklisted
 *    refresh — the session is dead and no retry can revive it.
 * 2. **Only one refresh may be in flight.** When six queued requests all come
 *    back 401 at once and each refreshes, the first rotation blacklists the
 *    token the other five are about to send, and five of six growers get signed
 *    out mid-task. [refreshOnce] serialises them: the first caller refreshes,
 *    the rest wait on the same mutex and are handed the result.
 */
@Singleton
class SessionManager @Inject constructor(
    private val store: SecureTokenStore,
) {

    private val mutex = Mutex()
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    /** Called once at startup, by the splash. */
    suspend fun hydrate() {
        val tokens = store.read()
        _state.value = if (tokens == null) SessionState.SignedOut else SessionState.SignedIn(tokens)
    }

    fun currentAccess(): String? = (_state.value as? SessionState.SignedIn)?.tokens?.access

    suspend fun signIn(tokens: SessionTokens) {
        mutex.withLock {
            store.write(tokens)
            _state.value = SessionState.SignedIn(tokens)
        }
    }

    /** Local teardown. The caller is responsible for telling Django to blacklist. */
    suspend fun signOut(expired: Boolean = false) {
        mutex.withLock {
            store.clear()
            _state.value = if (expired) SessionState.Expired else SessionState.SignedOut
        }
    }

    /**
     * Refresh, unless someone already did.
     *
     * [staleAccess] is the token the failing request actually carried. If the
     * stored access token has moved on since, another caller's refresh already
     * succeeded and this one must reuse it rather than spend — and blacklist —
     * a second refresh token.
     *
     * [performRefresh] is passed in rather than injected so this class never
     * depends on the network layer that depends on it.
     */
    suspend fun refreshOnce(
        staleAccess: String?,
        performRefresh: suspend (refresh: String) -> SessionTokens?,
    ): RefreshOutcome = mutex.withLock {
        val current = _state.value as? SessionState.SignedIn ?: return RefreshOutcome.Failed

        if (staleAccess != null && current.tokens.access != staleAccess) {
            return RefreshOutcome.AlreadyFresh(current.tokens.access)
        }

        val renewed = runCatching { performRefresh(current.tokens.refresh) }.getOrNull()
        if (renewed == null) {
            store.clear()
            _state.value = SessionState.Expired
            return RefreshOutcome.Failed
        }

        // One write, both tokens. Django may or may not send a new refresh
        // token; when it does, the old one is already blacklisted, so keeping it
        // would be keeping a dead credential.
        store.write(renewed)
        _state.value = SessionState.SignedIn(renewed)
        RefreshOutcome.Renewed(renewed.access)
    }
}
