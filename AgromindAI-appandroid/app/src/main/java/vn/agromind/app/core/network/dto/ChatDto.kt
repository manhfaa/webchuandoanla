package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChatRespondRequest(
    /** "assistant" (hỏi về kết quả đã lưu) or "expert" (tư vấn nông nghiệp). */
    val mode: String,
    val query: String,
    @SerialName("client_request_id") val clientRequestId: String,
    @SerialName("conversation_id") val conversationId: Int? = null,
    /**
     * Only meaningful for `assistant`. The server drops it for `expert`
     * regardless — the separation between the two workspaces is not the client's
     * to enforce.
     */
    @SerialName("diagnosis_id") val diagnosisId: Int? = null,
)

@Serializable
data class ChatRespondResponse(
    val mode: String = "assistant",
    val answer: String = "",
    @SerialName("conversation_id") val conversationId: Int = 0,
    @SerialName("message_id") val messageId: Int = 0,
    @SerialName("generated_at") val generatedAt: String = "",
)

@Serializable
data class ChatMessageDto(
    val id: Int = 0,
    val conversation: Int = 0,
    val role: String = "user",
    val content: String = "",
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class ChatConversationDto(
    val id: Int = 0,
    val diagnosis: Int? = null,
    /** Django's own naming: "advisor" is the diagnosis workspace. */
    val mode: String = "advisor",
    val title: String = "",
    val messages: List<ChatMessageDto> = emptyList(),
    @SerialName("updated_at") val updatedAt: String = "",
)

@Serializable
data class ServicePlanDto(
    val id: Int = 0,
    val slug: String = "",
    val name: String = "",
    val description: String = "",
    @SerialName("price_monthly") val priceMonthly: String = "0",
    val currency: String = "VND",
    @SerialName("subscription_days") val subscriptionDays: Int = 30,
    @SerialName("rag_enabled") val ragEnabled: Boolean = false,
    @SerialName("expert_chat_enabled") val expertChatEnabled: Boolean = false,
    @SerialName("max_diagnoses_per_month") val maxDiagnosesPerMonth: Int = 0,
)
