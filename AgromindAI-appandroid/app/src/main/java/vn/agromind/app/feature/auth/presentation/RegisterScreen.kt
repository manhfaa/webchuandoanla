package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton

@Composable
fun RegisterScreen(
    onBack: () -> Unit,
    registerUrl: String,
    onOpenLink: (String) -> Unit,
) {
    val colors = AgroTheme.colors

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.xl)
            .widthIn(max = 480.dp),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.lg),
    ) {
        Text("Tạo tài khoản", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
        Text(
            "Tài khoản mới được tạo bằng Google trên website Agromind AI để bảo vệ quá trình đăng ký.",
            style = AgroTheme.typography.body,
            color = colors.inkSecondary,
        )
        Text(
            "Sau khi hoàn tất, quay lại ứng dụng và tiếp tục bằng cùng tài khoản Google.",
            style = AgroTheme.typography.body,
            color = colors.inkPrimary,
        )
        PrimaryButton(
            label = "Mở trang đăng ký",
            modifier = Modifier.fillMaxWidth(),
            onClick = { onOpenLink(registerUrl) },
        )
        TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Quay lại đăng nhập", style = AgroTheme.typography.bodyStrong)
        }
    }
}
