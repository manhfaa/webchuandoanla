package vn.agromind.app.core.network

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import retrofit2.HttpException
import retrofit2.Response
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

/**
 * Turns a Retrofit outcome into either a value or a typed [AgroError].
 *
 * DRF is not consistent about where the message lives — `detail` for
 * `APIException`, `non_field_errors` for serializer-level validation, `error`
 * for hand-written views, and a dict of field names for everything else. All
 * four are read here, once, so no screen has to guess.
 */
object ErrorMapper {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    /** Runs [call] and maps whatever happens. */
    suspend fun <T> guard(call: suspend () -> T): AgroResult<T> = try {
        AgroResult.Ok(call())
    } catch (e: HttpException) {
        AgroResult.Err(fromHttp(e.code(), e.response()))
    } catch (e: SocketTimeoutException) {
        AgroResult.Err(AgroError.Timeout())
    } catch (e: UnknownHostException) {
        AgroResult.Err(AgroError.Offline())
    } catch (e: SSLException) {
        AgroResult.Err(
            AgroError.SecurityGateway(
                "Kết nối bảo mật tới máy chủ chưa thiết lập được. Bạn kiểm tra mạng giúp mình nhé.",
            ),
        )
    } catch (e: IOException) {
        AgroResult.Err(AgroError.Offline())
    } catch (e: kotlinx.serialization.SerializationException) {
        // A well-formed error body would have been handled above, so reaching
        // here on a 2xx means the body was not the JSON we expected — most often
        // an HTML interstitial that returned 200.
        AgroResult.Err(AgroError.SecurityGateway())
    } catch (e: Exception) {
        AgroResult.Err(AgroError.Unexpected(code = e::class.simpleName))
    }

    fun fromHttp(code: Int, response: Response<*>?): AgroError {
        val raw = runCatching { response?.errorBody()?.string() }.getOrNull().orEmpty()
        val contentType = response?.raw()?.header("Content-Type").orEmpty()

        // Cloudflare answers a blocked or challenged request with an HTML page.
        // Trying to read `detail` out of that produces a nonsense message and
        // hides the real cause, so it is identified before anything is parsed.
        if (looksLikeHtml(raw, contentType)) return AgroError.SecurityGateway()

        val body = runCatching { json.parseToJsonElement(raw) as? JsonObject }.getOrNull()
        val message = messageOf(body)

        return when (code) {
            400 -> AgroError.Validation(
                message = message ?: "Thông tin chưa hợp lệ. Bạn kiểm tra lại giúp mình nhé.",
                fields = fieldErrors(body),
            )
            401 -> AgroError.SessionExpired()
            402 -> AgroError.PlanLimit(
                message = message ?: "Bạn đã dùng hết hạn mức của gói hiện tại.",
                plan = body.stringOf("plan"),
                feature = body.stringOf("feature"),
                limit = body.intOf("limit"),
                used = body.intOf("used"),
                upgradeTo = body.stringOf("upgrade_to"),
            )
            403 -> AgroError.Forbidden(message ?: "Bạn chưa có quyền dùng mục này.")
            404 -> AgroError.NotFound(message ?: "Không tìm thấy dữ liệu này.")
            409 -> AgroError.Conflict(message ?: "Dữ liệu đã thay đổi. Bạn thử lại giúp mình nhé.")
            413 -> AgroError.BadImage(message ?: "Ảnh quá lớn. Bạn chụp lại hoặc chọn ảnh nhỏ hơn nhé.")
            415 -> AgroError.BadImage(message ?: "Định dạng ảnh này chưa đọc được. Bạn chọn ảnh JPEG hoặc PNG nhé.")
            429 -> AgroError.Throttled(
                message = message ?: "Bạn thao tác hơi nhanh. Chờ một chút rồi thử lại giúp mình nhé.",
                retryAfterSeconds = response?.raw()?.header("Retry-After")?.toIntOrNull(),
            )
            426 -> AgroError.UpdateRequired(message ?: "Bạn cần cập nhật ứng dụng để tiếp tục.")
            502 -> AgroError.AiUnavailable(
                message = message ?: "Dịch vụ phân tích đang lỗi. Bạn thử lại sau ít phút nhé.",
                step = body.stringOf("step"),
                retryable = true,
            )
            503 -> AgroError.AiUnavailable(
                message = message ?: "Dịch vụ tạm chưa sẵn sàng. Bạn thử lại sau ít phút nhé.",
                step = body.stringOf("step"),
                // 503 from Django here means "not configured on the server".
                // Retrying in ten seconds will not help and the copy should not
                // pretend otherwise.
                retryable = false,
            )
            in 500..599 -> AgroError.Unexpected(
                "Máy chủ đang gặp sự cố. Bạn thử lại sau ít phút giúp mình nhé.",
                code = code.toString(),
            )
            else -> AgroError.Unexpected(message ?: "Có lỗi chưa rõ.", code = code.toString())
        }
    }

    private fun looksLikeHtml(raw: String, contentType: String): Boolean {
        if (contentType.contains("text/html", ignoreCase = true)) return true
        val head = raw.trimStart().take(64).lowercase()
        return head.startsWith("<!doctype html") || head.startsWith("<html")
    }

    private fun messageOf(body: JsonObject?): String? {
        if (body == null) return null
        body.stringOf("detail")?.let { return it }
        body.stringOf("error")?.let { return it }
        (body["non_field_errors"] as? JsonArray)
            ?.firstNotNullOfOrNull { (it as? JsonPrimitive)?.contentOrNull }
            ?.let { return it }
        // Fall back to the first field error, so a 400 is never a blank screen.
        return fieldErrors(body).values.firstOrNull()
    }

    private fun fieldErrors(body: JsonObject?): Map<String, String> {
        if (body == null) return emptyMap()
        return body.entries.mapNotNull { (key, value) ->
            if (key in RESERVED) return@mapNotNull null
            val text = when (value) {
                is JsonArray -> value.firstNotNullOfOrNull { (it as? JsonPrimitive)?.contentOrNull }
                is JsonPrimitive -> value.contentOrNull
                else -> null
            }
            text?.let { key to it }
        }.toMap()
    }

    private val RESERVED = setOf(
        "detail", "error", "code", "plan", "feature", "limit", "used", "upgrade_to", "step",
        "non_field_errors", "request_id", "available", "charged", "conversation_id",
    )

    private fun JsonObject?.stringOf(key: String): String? =
        (this?.get(key) as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() && it != "null" }

    private fun JsonObject?.intOf(key: String): Int? = (this?.get(key) as? JsonPrimitive)?.intOrNull
}
