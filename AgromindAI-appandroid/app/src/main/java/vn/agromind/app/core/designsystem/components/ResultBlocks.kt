package vn.agromind.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Handshake
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.model.ActionTiming
import vn.agromind.app.core.model.Source

/**
 * One recommended action, headed by when to do it.
 *
 * The timing leads because that is the question a grower standing in front of a
 * sick plant is actually asking. It is also read first by TalkBack — "Ngay hôm
 * nay: cắt bỏ lá bệnh…" — rather than left as a coloured band they cannot hear.
 *
 * There is deliberately no "phun thuốc ngay" action anywhere in this component's
 * vocabulary. The strongest thing the `WhenWorse` card can suggest is asking a
 * local extension officer: this is a reference tool reading a photo, and telling
 * someone to spray a pesticide on that basis is beyond what it can justify.
 */
@Composable
fun ActionTimingCard(
    timing: ActionTiming,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
) {
    val colors = AgroTheme.colors
    val (label, headerColor) = when (timing) {
        ActionTiming.Today -> "NGAY HÔM NAY" to colors.softLeaf
        ActionTiming.InTwoOrThreeDays -> "TRONG 2-3 NGÀY" to colors.sun.copy(alpha = 0.14f)
        ActionTiming.WhenWorse -> "KHI DẤU HIỆU TĂNG" to colors.danger.copy(alpha = 0.13f)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .semantics { contentDescription = "$label: $title. $body" },
    ) {
        Text(
            text = label,
            style = AgroTheme.typography.label,
            color = colors.inkPrimary,
            modifier = Modifier
                .fillMaxWidth()
                .background(headerColor)
                .padding(horizontal = AgroSpacing.sm, vertical = 6.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(AgroSpacing.md),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
            Text(body, style = AgroTheme.typography.body, color = colors.inkSecondary)
        }
    }
}

/**
 * The web sources a summary was written from.
 *
 * Shown in full rather than hidden behind "xem nguồn": a claim about what to do
 * to a crop should arrive with the evidence attached, and a grower who wants to
 * check it should not have to go looking.
 *
 * Links open in the external browser. The app deliberately does not render them
 * in a WebView — a third-party page inside the app frame looks like the app
 * saying it, and this content is not ours.
 */
@Composable
fun SourceList(
    sources: List<Source>,
    onOpen: (Source) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (sources.isEmpty()) return
    val colors = AgroTheme.colors

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
    ) {
        sources.forEach { source ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.surface)
                    .border(1.dp, colors.divider, AgroTheme.shapes.card)
                    .clickable { onOpen(source) }
                    .padding(AgroSpacing.sm)
                    .heightIn(min = AgroSpacing.minTouch)
                    .semantics {
                        contentDescription =
                            "Mở trang ${source.domain}: ${source.title}, liên kết, mở bằng trình duyệt"
                    },
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(source.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                    Text(source.domain, style = AgroTheme.typography.mono, color = colors.info)
                    if (source.snippet.isNotBlank()) {
                        Spacer(Modifier.size(4.dp))
                        Text(source.snippet, style = AgroTheme.typography.body, color = colors.inkSecondary)
                    }
                }
                Spacer(Modifier.width(AgroSpacing.xs))
                Icon(
                    // Auto-mirrored: the "leaves the app" arrow has to point the
                    // other way in an RTL layout to keep meaning the same thing.
                    Icons.AutoMirrored.Outlined.OpenInNew,
                    contentDescription = null,
                    tint = colors.inkSecondary,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

/**
 * The line that says this is a reference, not a diagnosis.
 *
 * Placed before the two closing buttons in the reading order rather than at the
 * very bottom, so it is not the thing a screen-reader user skips past on their
 * way to "Ghi vào nhật ký".
 */
@Composable
fun SafetyNote(text: String, modifier: Modifier = Modifier) {
    val colors = AgroTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.softLeaf)
            .padding(AgroSpacing.md),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            Icons.Outlined.Handshake,
            contentDescription = null,
            tint = colors.soil,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.width(AgroSpacing.sm))
        Text(text, style = AgroTheme.typography.body, color = colors.inkPrimary)
    }
}
