package vn.agromind.app.feature.chat.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/**
 * Which conversation the grower wants.
 *
 * The choice is real, not cosmetic: the two workspaces are separate on the
 * server and one of them genuinely never sees the grower's photos or history.
 * Making that a deliberate pick — rather than a toggle buried in a chat screen —
 * is what lets the copy promise it honestly.
 *
 * "Tư vấn nông nghiệp" is disabled when the plan does not include it, with the
 * plan's own wording, instead of failing after the first question is typed.
 */
@Composable
fun ChatChooserScreen(
    onPickAssistant: () -> Unit,
    onPickExpert: () -> Unit,
    expertAvailable: Boolean,
) {
    val colors = AgroTheme.colors

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Chat tư vấn", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        Choice(
            title = "Hỏi về kết quả đã lưu",
            body = "Mình trả lời dựa trên ảnh và kết luận của lần kiểm tra bạn chọn.",
            enabled = true,
            onClick = onPickAssistant,
        )

        Choice(
            title = "Tư vấn nông nghiệp",
            body = if (expertAvailable) {
                "Hỏi chung về đất, nước, phân bón, mùa vụ. Chế độ này không dùng ảnh hay lịch sử kiểm tra của bạn."
            } else {
                "Chưa có trong gói hiện tại của bạn."
            },
            enabled = expertAvailable,
            onClick = onPickExpert,
        )

        // Said once, plainly, at the point of choosing: this is a model, not a
        // person, and the app must never let someone believe otherwise while
        // they are deciding whether to trust the answer.
        Text(
            "Đây là trợ lý AI, không phải chuyên gia trực tiếp. Kết quả chỉ để tham khảo.",
            style = AgroTheme.typography.mono,
            color = colors.inkSecondary,
        )
    }
}

@Composable
private fun Choice(title: String, body: String, enabled: Boolean, onClick: () -> Unit) {
    val colors = AgroTheme.colors
    Column(
        Modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.cardLarge)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.cardLarge)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(AgroSpacing.md)
            .semantics(mergeDescendants = true) {
                contentDescription = if (enabled) "$title. $body" else "$title, chưa có trong gói của bạn"
            },
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            title,
            style = AgroTheme.typography.sectionTitle,
            color = if (enabled) colors.inkPrimary else colors.inkSecondary,
        )
        Text(body, style = AgroTheme.typography.body, color = colors.inkSecondary)
    }
}
