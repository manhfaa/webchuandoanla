package vn.agromind.app.feature.chat.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.ChatApi
import vn.agromind.app.core.network.dto.ChatRespondRequest
import java.util.UUID
import javax.inject.Inject

/** One turn in the conversation, as the screen holds it. */
data class ChatTurn(
    val fromUser: Boolean,
    val text: String,
    val state: SendState = SendState.Sent,
    /** The id this turn was sent under, so a retry reuses it. */
    val requestId: String = "",
)

enum class SendState { Sending, Sent, Failed, QuotaExceeded }

data class ChatUiState(
    val mode: String = "assistant",
    val diagnosisId: Int? = null,
    val turns: List<ChatTurn> = emptyList(),
    val draft: String = "",
    val conversationId: Int? = null,
    /** Set when the plan is out of questions; the composer is replaced, not disabled. */
    val quotaError: AgroError.PlanLimit? = null,
) {
    val canSend: Boolean
        get() = draft.isNotBlank() && quotaError == null && turns.none { it.state == SendState.Sending }
}

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val api: ChatApi,
    savedState: SavedStateHandle,
) : ViewModel() {

    private val _state = MutableStateFlow(
        ChatUiState(
            mode = savedState.get<String>("mode") ?: "assistant",
            diagnosisId = savedState.get<String>("diagnosis")?.toIntOrNull()?.takeIf { it > 0 },
        ),
    )
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    fun onDraftChange(value: String) = _state.update { it.copy(draft = value) }

    fun send() {
        val current = _state.value
        if (!current.canSend) return

        val question = current.draft.trim()
        val requestId = UUID.randomUUID().toString()

        _state.update {
            it.copy(
                // The draft is cleared only after the turn is recorded, so a
                // failure never loses what the grower typed — it is on screen in
                // the failed bubble and "Gửi lại" reuses it.
                draft = "",
                turns = it.turns + ChatTurn(true, question, SendState.Sending, requestId),
            )
        }

        viewModelScope.launch { deliver(question, requestId) }
    }

    /** Retries the same question under the same id, so it is not charged twice. */
    fun retry(turn: ChatTurn) {
        if (turn.state != SendState.Failed) return
        _state.update { s ->
            s.copy(turns = s.turns.map { if (it.requestId == turn.requestId) it.copy(state = SendState.Sending) else it })
        }
        viewModelScope.launch { deliver(turn.text, turn.requestId) }
    }

    private suspend fun deliver(question: String, requestId: String) {
        val current = _state.value
        val result = ErrorMapper.guard {
            api.respond(
                ChatRespondRequest(
                    mode = current.mode,
                    query = question,
                    clientRequestId = requestId,
                    conversationId = current.conversationId,
                    diagnosisId = current.diagnosisId,
                ),
            )
        }

        when (result) {
            is AgroResult.Ok -> _state.update { s ->
                s.copy(
                    conversationId = result.value.conversationId,
                    turns = s.turns.map {
                        if (it.requestId == requestId) it.copy(state = SendState.Sent) else it
                    } + ChatTurn(false, result.value.answer),
                )
            }

            is AgroResult.Err -> {
                val quota = result.error as? AgroError.PlanLimit
                _state.update { s ->
                    s.copy(
                        quotaError = quota,
                        turns = s.turns.map {
                            if (it.requestId == requestId) {
                                it.copy(
                                    state = if (quota != null) SendState.QuotaExceeded else SendState.Failed,
                                )
                            } else {
                                it
                            }
                        },
                    )
                }
            }
        }
    }
}

/**
 * Chat tư vấn.
 *
 * Two things this screen must not do, both of which are easy to get wrong:
 *
 * * **It must not claim to reach a human.** The copy says "mình" throughout and
 *   never suggests an expert is on the other end.
 * * **In "Tư vấn nông nghiệp" it must not imply it is reading the grower's
 *   photos or history.** That workspace genuinely does not receive them — the
 *   server drops the diagnosis id — so the screen shows no context chip and says
 *   so plainly.
 */
@Composable
fun ChatScreen(
    onBack: () -> Unit,
    onUpgrade: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors
    val isExpert = ui.mode == "expert"

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .padding(horizontal = AgroSpacing.gutterCompact),
    ) {
        Text(
            if (isExpert) "Tư vấn nông nghiệp" else "Hỏi về kết quả đã lưu",
            style = AgroTheme.typography.screenTitle,
            color = colors.inkPrimary,
            modifier = Modifier.padding(vertical = AgroSpacing.sm),
        )
        Text(
            if (isExpert) {
                "Hỏi chung về canh tác. Chế độ này không dùng ảnh hay lịch sử kiểm tra của bạn."
            } else {
                "Mình trả lời dựa trên ảnh và kết luận của lần kiểm tra bạn đã chọn."
            },
            style = AgroTheme.typography.label,
            color = colors.inkSecondary,
        )

        LazyColumn(
            Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = AgroSpacing.sm),
        ) {
            items(ui.turns) { turn -> Bubble(turn, onRetry = { viewModel.retry(turn) }) }
        }

        if (ui.quotaError != null) {
            // The composer is replaced, not greyed out: a disabled box with no
            // explanation is the most frustrating possible answer to "hết lượt".
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.softLeaf)
                    .padding(AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            ) {
                Text(
                    ui.quotaError!!.message,
                    style = AgroTheme.typography.body,
                    color = colors.inkPrimary,
                )
                PrimaryButton(label = "Xem gói dịch vụ", onClick = onUpgrade)
                SecondaryButton(label = "Quay lại", onClick = onBack)
            }
        } else {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = AgroSpacing.xs),
                verticalAlignment = Alignment.Bottom,
            ) {
                OutlinedTextField(
                    value = ui.draft,
                    onValueChange = viewModel::onDraftChange,
                    modifier = Modifier
                        .weight(1f)
                        .defaultMinSize(minHeight = 52.dp),
                    placeholder = { Text("Bạn muốn hỏi gì?") },
                )
                Spacer(Modifier.width(AgroSpacing.xs))
                IconButton(
                    onClick = viewModel::send,
                    enabled = ui.canSend,
                    modifier = Modifier.size(52.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Gửi câu hỏi",
                        tint = if (ui.canSend) colors.leaf else colors.inkSecondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun Bubble(turn: ChatTurn, onRetry: () -> Unit) {
    val colors = AgroTheme.colors
    val shape = if (turn.fromUser) {
        RoundedCornerShape(18.dp, 18.dp, 6.dp, 18.dp)
    } else {
        RoundedCornerShape(18.dp, 18.dp, 18.dp, 6.dp)
    }

    Box(
        Modifier.fillMaxWidth(),
        contentAlignment = if (turn.fromUser) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Column(horizontalAlignment = if (turn.fromUser) Alignment.End else Alignment.Start) {
            Box(
                Modifier
                    .fillMaxWidth(0.88f)
                    .clip(shape)
                    .background(if (turn.fromUser) colors.forest else colors.surface)
                    .then(
                        if (turn.fromUser) Modifier else Modifier.border(1.dp, colors.divider, shape),
                    )
                    .padding(AgroSpacing.sm)
                    .alpha(if (turn.state == SendState.Failed) 0.55f else 1f),
            ) {
                Text(
                    turn.text,
                    style = AgroTheme.typography.body,
                    color = if (turn.fromUser) colors.onForest else colors.inkPrimary,
                )
            }

            when (turn.state) {
                // Reduced-motion friendly and honest: a word rather than three
                // bouncing dots that keep animating if the request hangs.
                SendState.Sending -> Text(
                    "Đang gửi…",
                    style = AgroTheme.typography.label,
                    color = colors.inkSecondary,
                )
                SendState.Failed -> Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Chưa gửi được", style = AgroTheme.typography.label, color = colors.danger)
                    Spacer(Modifier.width(AgroSpacing.xs))
                    androidx.compose.material3.TextButton(onClick = onRetry) {
                        Text("Gửi lại", style = AgroTheme.typography.label, color = colors.leafStrong)
                    }
                }
                else -> Unit
            }
        }
    }
}
