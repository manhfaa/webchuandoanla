package vn.agromind.app.feature.more.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.EventNote
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.WbCloudy
import androidx.compose.material.icons.outlined.Workspaces
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/** One entry in the "Thêm" list. [enabled] is false while a section is still being built. */
private data class MoreEntry(
    val label: String,
    val hint: String,
    val icon: ImageVector,
    val enabled: Boolean,
    val onClick: () -> Unit,
)

/**
 * Thêm.
 *
 * A plain list rather than a grid of tiles: these are destinations of different
 * weights, read one at a time, and a grid would imply they are equivalent.
 *
 * Sections that are not built yet are shown greyed with "đang được xây dựng"
 * rather than hidden. Hiding them would leave the grower wondering whether the
 * app has a weather screen at all; saying so is honest and costs one line.
 */
@Composable
fun MoreScreen(
    contentPadding: PaddingValues,
    onChat: () -> Unit,
    onPlans: () -> Unit,
    onProfile: () -> Unit,
    onWeather: () -> Unit,
    onCropPlans: () -> Unit,
    onLibrary: () -> Unit,
    weatherReady: Boolean = false,
    cropPlansReady: Boolean = false,
    libraryReady: Boolean = false,
) {
    val entries = listOf(
        MoreEntry("Chat tư vấn", "Hỏi về kết quả đã lưu hoặc hỏi chung về canh tác", Icons.AutoMirrored.Outlined.Chat, true, onChat),
        MoreEntry("Gói dịch vụ", "Xem hạn mức và nâng cấp", Icons.Outlined.Workspaces, true, onPlans),
        MoreEntry("Hồ sơ & cài đặt", "Tài khoản, giao diện, bảo mật", Icons.Outlined.Person, true, onProfile),
        MoreEntry("Thời tiết & cảnh báo", "Dự báo và cảnh báo sâu bệnh ở vườn", Icons.Outlined.WbCloudy, weatherReady, onWeather),
        MoreEntry("Kế hoạch trồng", "Lịch chăm sóc theo từng bước", Icons.Outlined.EventNote, cropPlansReady, onCropPlans),
        MoreEntry("Thư viện vật tư", "Tra cứu phân bón và thuốc bảo vệ thực vật", Icons.Outlined.Inventory2, libraryReady, onLibrary),
    )

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                start = AgroSpacing.gutterCompact,
                end = AgroSpacing.gutterCompact,
                top = AgroSpacing.md,
                bottom = contentPadding.calculateBottomPadding() + AgroSpacing.lg,
            ),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
    ) {
        Text("Thêm", style = AgroTheme.typography.screenTitle, color = AgroTheme.colors.inkPrimary)
        Spacer(Modifier.size(AgroSpacing.xs))
        entries.forEach { EntryRow(it) }
    }
}

@Composable
private fun EntryRow(entry: MoreEntry) {
    val colors = AgroTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .then(if (entry.enabled) Modifier.clickable(onClick = entry.onClick) else Modifier)
            .padding(AgroSpacing.md)
            .heightIn(min = AgroSpacing.minTouch)
            .semantics(mergeDescendants = true) {
                contentDescription = if (entry.enabled) {
                    "${entry.label}. ${entry.hint}"
                } else {
                    "${entry.label}, đang được xây dựng"
                }
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            entry.icon,
            contentDescription = null,
            tint = if (entry.enabled) colors.leafStrong else colors.inkSecondary,
        )
        Spacer(Modifier.width(AgroSpacing.sm))
        Column(Modifier.weight(1f)) {
            Text(
                entry.label,
                style = AgroTheme.typography.bodyStrong,
                color = if (entry.enabled) colors.inkPrimary else colors.inkSecondary,
            )
            Text(
                if (entry.enabled) entry.hint else "Đang được xây dựng",
                style = AgroTheme.typography.label,
                color = colors.inkSecondary,
            )
        }
    }
}
