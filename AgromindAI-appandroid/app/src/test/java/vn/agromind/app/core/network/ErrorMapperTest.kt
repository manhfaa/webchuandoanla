package vn.agromind.app.core.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response
import vn.agromind.app.core.common.AgroError

/**
 * Error mapping, tested against the shapes Django and Cloudflare actually send.
 *
 * The two that matter most are the ones a generic `catch (e: Exception)` gets
 * wrong: a 402 whose payload the upgrade screen needs, and an HTML challenge
 * page that would otherwise surface as a JSON parse bug.
 */
class ErrorMapperTest {

    private fun errorResponse(code: Int, body: String, contentType: String = "application/json") =
        Response.error<Any>(code, body.toResponseBody(contentType.toMediaType()))

    @Test
    fun `402 keeps the numbers the upgrade screen renders`() {
        val error = ErrorMapper.fromHttp(
            402,
            errorResponse(
                402,
                """
                {"detail":"Gói Seed cho phép 3 lượt kiểm tra ảnh lá mỗi ngày và bạn đã dùng hết (3/3).",
                 "code":"plan_limit_exceeded","plan":"seed","limit":3,"used":3,"upgrade_to":"grow"}
                """.trimIndent(),
            ),
        )

        assertTrue(error is AgroError.PlanLimit)
        error as AgroError.PlanLimit
        assertEquals(3, error.limit)
        assertEquals(3, error.used)
        assertEquals("grow", error.upgradeTo)
        assertEquals("seed", error.plan)
        assertTrue(error.message.contains("Gói Seed"))
    }

    @Test
    fun `402 for a locked feature reports the feature, not a cap`() {
        val error = ErrorMapper.fromHttp(
            402,
            errorResponse(
                402,
                """{"detail":"Chưa có trong gói Seed.","code":"plan_feature_locked","feature":"rag","upgrade_to":"grow"}""",
            ),
        )

        assertEquals("rag", (error as AgroError.PlanLimit).feature)
        assertEquals(null, error.limit)
    }

    @Test
    fun `a Cloudflare challenge page is not a parse failure`() {
        // A JSON client cannot solve a browser challenge. Reporting this as a
        // serialization bug would send someone hunting through the app for a
        // problem that lives in the WAF rules.
        val error = ErrorMapper.fromHttp(
            403,
            errorResponse(403, "<!DOCTYPE html><html><head><title>Just a moment...</title>", "text/html"),
        )

        assertTrue(error is AgroError.SecurityGateway)
    }

    @Test
    fun `an HTML body without a content type is still recognised`() {
        val error = ErrorMapper.fromHttp(503, errorResponse(503, "  <html><body>502 Bad Gateway</body></html>"))

        assertTrue(error is AgroError.SecurityGateway)
    }

    @Test
    fun `DRF field errors reach the form`() {
        val error = ErrorMapper.fromHttp(
            400,
            errorResponse(400, """{"email":["Email này đã được dùng."],"password":["Mật khẩu quá ngắn."]}"""),
        )

        error as AgroError.Validation
        assertEquals("Email này đã được dùng.", error.fields["email"])
        assertEquals("Mật khẩu quá ngắn.", error.fields["password"])
        // The banner falls back to the first field error rather than showing a
        // 400 with no explanation.
        assertTrue(error.message.isNotBlank())
    }

    @Test
    fun `non_field_errors is read when there is no detail`() {
        val error = ErrorMapper.fromHttp(
            400,
            errorResponse(400, """{"non_field_errors":["Email hoặc mật khẩu chưa đúng."]}"""),
        )

        assertEquals("Email hoặc mật khẩu chưa đúng.", error.message)
        assertTrue((error as AgroError.Validation).fields.isEmpty())
    }

    @Test
    fun `503 from a provider is reported as not worth retrying`() {
        // 503 here means the key is missing on the server. Telling the grower to
        // try again in a moment would be false: nothing changes until an
        // operator sets it.
        val error = ErrorMapper.fromHttp(
            503,
            errorResponse(503, """{"detail":"Dịch vụ AI chưa được bật.","step":"viết câu hỏi","available":false}"""),
        )

        error as AgroError.AiUnavailable
        assertEquals("viết câu hỏi", error.step)
        assertEquals(false, error.retryable)
    }

    @Test
    fun `502 from a provider names the failing stage and allows a retry`() {
        val error = ErrorMapper.fromHttp(
            502,
            errorResponse(502, """{"detail":"Không tìm được nguồn.","step":"tìm phương pháp xử lý"}"""),
        )

        error as AgroError.AiUnavailable
        assertEquals("tìm phương pháp xử lý", error.step)
        assertEquals(true, error.retryable)
    }

    @Test
    fun `413 and 415 are one thing to the grower - the photo`() {
        assertTrue(ErrorMapper.fromHttp(413, errorResponse(413, """{"detail":"Ảnh quá lớn."}""")) is AgroError.BadImage)
        assertTrue(ErrorMapper.fromHttp(415, errorResponse(415, """{"detail":"Định dạng chưa hỗ trợ."}""")) is AgroError.BadImage)
    }

    @Test
    fun `an empty body still produces something readable`() {
        val error = ErrorMapper.fromHttp(500, errorResponse(500, ""))

        assertTrue(error.message.isNotBlank())
        assertEquals("500", (error as AgroError.Unexpected).code)
    }
}
