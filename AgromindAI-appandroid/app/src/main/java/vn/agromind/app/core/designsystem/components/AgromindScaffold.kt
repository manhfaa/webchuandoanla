package vn.agromind.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Grass
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroTheme

/** The five fixed destinations, in the order `design/INFORMATION-ARCHITECTURE.md` fixes them. */
enum class TopTab(val label: String, val icon: ImageVector) {
    Today("Hôm nay", Icons.Outlined.WbSunny),
    History("Lịch sử", Icons.Outlined.History),

    /**
     * The leaf check. Rendered as a raised circle in the middle of the bar
     * rather than as a floating action button.
     *
     * A FAB would sit *over* the content and cover the bottom row of whatever
     * list is behind it — on a history list that is a result the grower cannot
     * tap. Keeping it inside the bar makes it the most prominent thing on screen
     * without taking anything away.
     */
    Check("Kiểm tra", Icons.Filled.Add),
    Garden("Vườn", Icons.Outlined.Grass),
    More("Thêm", Icons.Outlined.Apps),
}

/**
 * The app frame: navigation, the offline banner, and nothing else.
 *
 * Adaptive by window width rather than by "phone or tablet": a phone in
 * landscape and a small tablet are the same problem, and a folded/unfolded
 * device changes class while the app is running.
 */
@Composable
fun AgromindScaffold(
    widthSizeClass: WindowWidthSizeClass,
    selected: TopTab,
    onSelect: (TopTab) -> Unit,
    offline: OfflineState,
    modifier: Modifier = Modifier,
    content: @Composable (PaddingValues) -> Unit,
) {
    val compact = widthSizeClass == WindowWidthSizeClass.Compact

    Scaffold(
        modifier = modifier,
        containerColor = AgroTheme.colors.canvas,
        bottomBar = { if (compact) BottomBar(selected, onSelect) },
    ) { padding ->
        Box(Modifier.fillMaxSize()) {
            if (compact) {
                Column(Modifier.fillMaxSize()) {
                    OfflineBanner(offline, Modifier.padding(top = padding.calculateTopPadding()))
                    content(padding)
                }
            } else {
                Column(Modifier.fillMaxSize()) {
                    OfflineBanner(offline, Modifier.padding(top = padding.calculateTopPadding()))
                    androidx.compose.foundation.layout.Row(Modifier.fillMaxSize()) {
                        Rail(selected, onSelect)
                        content(padding)
                    }
                }
            }
        }
    }
}

@Composable
private fun BottomBar(selected: TopTab, onSelect: (TopTab) -> Unit) {
    val colors = AgroTheme.colors
    NavigationBar(containerColor = colors.surface, tonalElevation = 0.dp) {
        TopTab.entries.forEach { tab ->
            if (tab == TopTab.Check) {
                // Rendered by hand rather than as a NavigationBarItem: it has to
                // be visibly the primary action, and the stock item cannot be
                // made to sit proud of the bar.
                NavigationBarItem(
                    selected = selected == tab,
                    onClick = { onSelect(tab) },
                    icon = {
                        Box(
                            Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(colors.leaf)
                                .border(3.dp, colors.surface, CircleShape)
                                .clickable { onSelect(tab) }
                                .semantics { contentDescription = "Kiểm tra ảnh lá" },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                tab.icon,
                                contentDescription = null,
                                tint = androidx.compose.ui.graphics.Color.White,
                                modifier = Modifier.size(28.dp),
                            )
                        }
                    },
                    label = null,
                )
            } else {
                NavigationBarItem(
                    selected = selected == tab,
                    onClick = { onSelect(tab) },
                    icon = { Icon(tab.icon, contentDescription = null) },
                    label = { Text(tab.label, style = AgroTheme.typography.label) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.leafStrong,
                        selectedTextColor = colors.leafStrong,
                        indicatorColor = colors.softLeaf,
                        unselectedIconColor = colors.inkSecondary,
                        unselectedTextColor = colors.inkSecondary,
                    ),
                )
            }
        }
    }
}

@Composable
private fun Rail(selected: TopTab, onSelect: (TopTab) -> Unit) {
    val colors = AgroTheme.colors
    NavigationRail(containerColor = colors.surface) {
        // The check moves to the top of the rail, where the eye lands first —
        // the same prominence the raised circle buys in the compact bar.
        NavigationRailItem(
            selected = selected == TopTab.Check,
            onClick = { onSelect(TopTab.Check) },
            icon = {
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(AgroTheme.shapes.card)
                        .background(colors.leaf),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        TopTab.Check.icon,
                        contentDescription = null,
                        tint = androidx.compose.ui.graphics.Color.White,
                    )
                }
            },
            label = { Text(TopTab.Check.label, style = AgroTheme.typography.label) },
        )

        TopTab.entries.filter { it != TopTab.Check }.forEach { tab ->
            NavigationRailItem(
                selected = selected == tab,
                onClick = { onSelect(tab) },
                icon = { Icon(tab.icon, contentDescription = null) },
                label = { Text(tab.label, style = AgroTheme.typography.label) },
            )
        }
    }
}
