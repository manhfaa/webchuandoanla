package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.FactCheck
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton

private data class OnboardingPage(val icon: ImageVector, val title: String, val body: String)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(onFinished: () -> Unit) {
    val pages = listOf(
        OnboardingPage(
            Icons.Outlined.CenterFocusStrong,
            "Chụp rõ một chiếc lá",
            "Agromind AI kiểm tra vùng lá trước khi phân tích để nhắc bạn chụp lại nếu ảnh chưa đủ rõ.",
        ),
        OnboardingPage(
            Icons.Outlined.FactCheck,
            "Nhận gợi ý có giải thích",
            "Xem các khả năng cần chú ý, mức độ tin cậy và nguồn tham khảo khi bạn bổ sung triệu chứng.",
        ),
        OnboardingPage(
            Icons.Outlined.CalendarMonth,
            "Theo dõi việc cần làm",
            "Lưu lịch sử, kế hoạch chăm sóc và nhận nhắc việc ngay trên điện thoại.",
        ),
    )
    val pager = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    val colors = AgroTheme.colors

    Column(
        Modifier.fillMaxSize().padding(AgroSpacing.gutterCompact),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onFinished) { Text("Bỏ qua") }
        }
        HorizontalPager(state = pager, modifier = Modifier.weight(1f)) { index ->
            val page = pages[index]
            Column(
                Modifier.fillMaxSize().padding(horizontal = AgroSpacing.md),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(112.dp).clip(AgroTheme.shapes.card).background(colors.softLeaf),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(page.icon, contentDescription = null, tint = colors.leafStrong, modifier = Modifier.size(52.dp))
                }
                Spacer(Modifier.height(AgroSpacing.lg))
                Text(page.title, style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
                Spacer(Modifier.height(AgroSpacing.sm))
                Text(page.body, style = AgroTheme.typography.body, color = colors.inkSecondary)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            pages.indices.forEach { index ->
                Box(
                    Modifier.size(if (index == pager.currentPage) 24.dp else 8.dp, 8.dp)
                        .clip(AgroTheme.shapes.chip)
                        .background(if (index == pager.currentPage) colors.leaf else colors.divider),
                )
            }
        }
        Spacer(Modifier.height(AgroSpacing.md))
        PrimaryButton(
            label = if (pager.currentPage == pages.lastIndex) "Bắt đầu" else "Tiếp tục",
            onClick = {
                if (pager.currentPage == pages.lastIndex) onFinished()
                else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) }
            },
        )
    }
}
