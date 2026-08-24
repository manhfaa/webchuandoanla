package vn.agromind.app.core.common

/**
 * Every way a call to Django can fail, as something a screen can actually react
 * to.
 *
 * The point of the list is that "hết lượt trong gói" and "mất mạng" must not both
 * arrive as a generic failure — one needs an upgrade CTA and the other needs a
 * retry button, and a grower shown the wrong one is stuck.
 */
sealed interface AgroError {

    /** Human-readable Vietnamese, safe to show as-is. */
    val message: String

    /** No usable connection, or the request never reached a server. */
    data class Offline(override val message: String = "Chưa có kết nối mạng.") : AgroError

    /** Reached the server, gave up waiting. Retrying is reasonable. */
    data class Timeout(
        override val message: String = "Máy chủ trả lời lâu hơn bình thường. Bạn thử lại giúp mình nhé.",
    ) : AgroError

    /** 400 with per-field errors from DRF. */
    data class Validation(
        override val message: String,
        val fields: Map<String, String> = emptyMap(),
    ) : AgroError

    /** 401 that survived a refresh. The session is gone; go to login. */
    data class SessionExpired(
        override val message: String = "Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại giúp mình nhé.",
    ) : AgroError

    /**
     * 402. The plan is the reason, and the payload says which cap and what to
     * upgrade to — so the screen can offer the upgrade instead of a dead end.
     */
    data class PlanLimit(
        override val message: String,
        val plan: String?,
        val feature: String?,
        val limit: Int?,
        val used: Int?,
        val upgradeTo: String?,
    ) : AgroError

    /** 403. Signed in, still not allowed. */
    data class Forbidden(override val message: String) : AgroError

    /** 404. Also what another account's record looks like, on purpose. */
    data class NotFound(override val message: String) : AgroError

    /** 409. Usually a replay whose stored answer has expired. */
    data class Conflict(override val message: String) : AgroError

    /** 413 / 415 — the photo is too big or not a format the model reads. */
    data class BadImage(override val message: String) : AgroError

    /** 429. `retryAfterSeconds` comes from the header when the server sends it. */
    data class Throttled(
        override val message: String,
        val retryAfterSeconds: Int?,
    ) : AgroError

    /**
     * 502/503 from an AI or search provider behind Django. `step` names the
     * stage that broke, so the app can say which part failed and keep the photo
     * and the description for a retry.
     */
    data class AiUnavailable(
        override val message: String,
        val step: String?,
        val retryable: Boolean,
    ) : AgroError

    /**
     * The reply was HTML, not JSON — almost always a Cloudflare challenge or
     * block page sitting in front of the API.
     *
     * A JSON client cannot solve a browser challenge, so this must surface as
     * its own thing. Letting the serializer choke on `<!DOCTYPE html>` would
     * report it as a parse bug and send someone hunting through the app for a
     * problem that is in the WAF rules.
     */
    data class SecurityGateway(
        override val message: String =
            "Hệ thống bảo vệ đang chặn kết nối này. Bạn thử lại sau ít phút hoặc đổi mạng giúp mình nhé.",
    ) : AgroError

    /** The app must be updated before it can talk to this server. */
    data class UpdateRequired(override val message: String) : AgroError

    /** Planned outage, from /api/mobile/config/. */
    data class Maintenance(override val message: String) : AgroError

    /** Anything genuinely unexpected. `code` is for a support line, not a title. */
    data class Unexpected(
        override val message: String = "Có lỗi chưa rõ. Bạn thử lại giúp mình nhé.",
        val code: String? = null,
    ) : AgroError
}
