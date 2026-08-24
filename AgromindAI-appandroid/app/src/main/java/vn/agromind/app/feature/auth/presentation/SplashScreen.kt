package vn.agromind.app.feature.auth.presentation

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Eco
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/**
 * What the grower sees while the encrypted session is being decrypted.
 *
 * It stays up for exactly that long. There is no minimum display time and no
 * padded delay to "show the brand": someone opening the app in a garden wants
 * the camera, not a logo, and an artificial 1.5s costs them that every single
 * launch.
 *
 * The bar pulses rather than reporting progress, because there is no progress to
 * report — a fake percentage that jumps to 100 is a lie about work that took one
 * frame.
 */
@Composable
fun SplashScreen(expired: Boolean = false) {
    val colors = AgroTheme.colors

    val alpha = if (AgroTheme.reduceMotion) {
        1f
    } else {
        val transition = rememberInfiniteTransition(label = "splash")
        val animated by transition.animateFloat(
            initialValue = 0.35f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
            label = "pulse",
        )
        animated
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(colors.canvas),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
            modifier = Modifier.padding(AgroSpacing.lg),
        ) {
            Box(
                Modifier
                    .size(96.dp)
                    .clip(RoundedCornerShape(34.dp))
                    .background(colors.forest),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.Eco,
                    contentDescription = null,
                    tint = colors.leaf,
                    modifier = Modifier.size(52.dp),
                )
            }

            Spacer(Modifier.height(AgroSpacing.xxs))

            Text("Agromind AI", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
            Text(
                "Người bạn đồng hành của nhà vườn",
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(AgroSpacing.md))

            Box(
                Modifier
                    .width(120.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .alpha(alpha)
                    .background(colors.leaf),
            )

            Text(
                text = if (expired) {
                    "Phiên làm việc đã hết hạn, đang đưa bạn về màn đăng nhập…"
                } else {
                    "Đang mở lại phiên làm việc…"
                },
                style = AgroTheme.typography.label,
                color = colors.inkSecondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}
