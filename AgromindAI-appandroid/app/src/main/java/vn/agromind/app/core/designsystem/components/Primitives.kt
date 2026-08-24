package vn.agromind.app.core.designsystem.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroMotion
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/**
 * Primary action.
 *
 * `defaultMinSize` rather than a fixed `height`: at 200% font the label needs
 * two lines, and a locked height would clip it. The button grows instead.
 *
 * While `loading` the label changes to [loadingLabel] and the button disables
 * itself, which is also what stops a double submit — a grower on a slow field
 * connection taps again when nothing seems to happen, and two sign-ups is not
 * the outcome they wanted.
 */
@Composable
fun PrimaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    loadingLabel: String = label,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AgroSpacing.primaryButtonHeight),
        shape = AgroTheme.shapes.button,
        colors = ButtonDefaults.buttonColors(
            containerColor = AgroTheme.colors.leaf,
            contentColor = Color.White,
            disabledContainerColor = AgroTheme.colors.divider,
            disabledContentColor = AgroTheme.colors.inkSecondary,
        ),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            horizontal = AgroSpacing.lg,
            vertical = AgroSpacing.sm,
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = Color.White,
            )
            Spacer(Modifier.width(AgroSpacing.sm))
        }
        Text(
            text = if (loading) loadingLabel else label,
            style = AgroTheme.typography.bodyStrong,
        )
    }
}

/**
 * Secondary action, same weight of type as the primary.
 *
 * "Bỏ qua bước này" is a real choice, not an escape hatch, so it is not made
 * visually quieter than "Xem kết quả". A grower with nothing to describe should
 * not feel they are doing something wrong.
 */
@Composable
fun SecondaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AgroSpacing.primaryButtonHeight),
        shape = AgroTheme.shapes.button,
        border = androidx.compose.foundation.BorderStroke(1.5.dp, AgroTheme.colors.divider),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = AgroTheme.colors.leafStrong),
    ) {
        Text(label, style = AgroTheme.typography.bodyStrong)
    }
}

/** Where a confidence number sits on the three-band scale. */
enum class ConfidenceBand { High, Watch, Recheck }

/**
 * The number the grower opened the screen for.
 *
 * Three rules that are easy to get wrong and expensive when they are:
 *
 * * The number is never dimmed and never shrunk. It is the headline.
 * * The band always carries a **word** as well as a colour. Roughly 8% of men
 *   have a red/green deficiency, and this app is mostly read by men working
 *   outdoors; a yellow bar with no label says nothing to them.
 * * `null` percent means the classifier produced nothing. It shows "—" with no
 *   track, and the band is forced to Recheck — never a plausible-looking 0%.
 */
@Composable
fun ConfidenceMeter(
    percent: Int?,
    band: ConfidenceBand,
    modifier: Modifier = Modifier,
) {
    val effectiveBand = if (percent == null) ConfidenceBand.Recheck else band
    val colors = AgroTheme.colors
    val bandColor = when (effectiveBand) {
        ConfidenceBand.High -> colors.leaf
        ConfidenceBand.Watch -> colors.sun
        ConfidenceBand.Recheck -> colors.info
    }
    val bandLabel = when (effectiveBand) {
        ConfidenceBand.High -> "Tin cậy cao"
        ConfidenceBand.Watch -> "Cần theo dõi"
        ConfidenceBand.Recheck -> "Nên kiểm tra lại"
    }

    val target = (percent ?: 0).coerceIn(0, 100) / 100f
    val fill by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(
            durationMillis = if (AgroTheme.reduceMotion) 0 else AgroMotion.ConfidenceMs,
            easing = AgroMotion.Standard,
        ),
        label = "confidence",
    )

    Column(
        modifier = modifier.semantics {
            contentDescription = if (percent == null) {
                "Chưa có mức độ tin cậy. $bandLabel."
            } else {
                "Mức độ tin cậy $percent phần trăm. $bandLabel."
            }
        },
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = percent?.let { "$it%" } ?: "—",
                style = AgroTheme.typography.confidence,
                color = colors.inkPrimary,
            )
            Spacer(Modifier.width(AgroSpacing.sm))
            Text(
                text = bandLabel,
                style = AgroTheme.typography.label,
                color = bandColor,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }

        if (percent != null) {
            Spacer(Modifier.height(AgroSpacing.xs))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(9.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(colors.divider),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(fill)
                        .height(9.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(bandColor),
                )
            }
        }
    }
}

/** Illustration slot for [StateBlock]. */
enum class StateArt { LeafLens, Contour, None }

data class StateAction(val label: String, val onClick: () -> Unit)

/**
 * Every empty and every error, in one component.
 *
 * The rule this enforces is that a state always offers something to do. A screen
 * that says only "Đã có lỗi xảy ra" leaves the grower holding a phone in a
 * garden with no next move, which is how a tool stops being used.
 *
 * An error code, when there is one, goes in a small mono line at the bottom for
 * support — never in the title, where it would replace the sentence that
 * actually helps.
 */
@Composable
fun StateBlock(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    art: StateArt = StateArt.LeafLens,
    primary: StateAction? = null,
    secondary: StateAction? = null,
    supportCode: String? = null,
) {
    val colors = AgroTheme.colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(AgroSpacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        if (art != StateArt.None) {
            Box(
                Modifier
                    .size(120.dp)
                    .clip(AgroTheme.shapes.leafLens)
                    .background(colors.softLeaf)
                    .border(1.dp, colors.divider, AgroTheme.shapes.leafLens)
                    // Decorative: announcing "hình minh hoạ chiếc lá" before the
                    // sentence that matters only slows a screen-reader user down.
                    .clearAndSetSemantics {},
            )
            Spacer(Modifier.height(AgroSpacing.xxs))
        }

        Text(title, style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
        Text(body, style = AgroTheme.typography.body, color = colors.inkSecondary)

        primary?.let {
            Spacer(Modifier.height(AgroSpacing.xxs))
            PrimaryButton(label = it.label, onClick = it.onClick)
        }
        secondary?.let { SecondaryButton(label = it.label, onClick = it.onClick) }

        supportCode?.let {
            Spacer(Modifier.height(AgroSpacing.xxs))
            Text("Mã hỗ trợ: $it", style = AgroTheme.typography.mono, color = colors.inkSecondary)
        }
    }
}

/** Connectivity, as the scaffold reports it. */
sealed interface OfflineState {
    data object Online : OfflineState
    data class Offline(val hasCache: Boolean) : OfflineState
    data object Syncing : OfflineState
}

/**
 * One line under the status bar. Never a dialog, never a toast.
 *
 * Offline is a condition, not an event: a dialog would interrupt whatever the
 * grower was doing and a toast would be gone before they looked up from the
 * plant. The banner states the condition and says whether there is saved data
 * behind it, then gets out of the way.
 */
@Composable
fun OfflineBanner(state: OfflineState, modifier: Modifier = Modifier) {
    if (state is OfflineState.Online) return
    val colors = AgroTheme.colors

    val (icon, text) = when (state) {
        is OfflineState.Offline ->
            Icons.Outlined.CloudOff to
                if (state.hasCache) "Đang offline · Dữ liệu đã lưu trên thiết bị"
                else "Đang offline · Chưa có dữ liệu đã lưu"
        OfflineState.Syncing -> Icons.Outlined.Sync to "Đang đồng bộ"
        OfflineState.Online -> return
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AgroSpacing.lg, vertical = AgroSpacing.xs)
            .clip(AgroTheme.shapes.button)
            .background(colors.softLeaf)
            .padding(horizontal = AgroSpacing.sm, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.sun,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(AgroSpacing.xs))
        Text(text, style = AgroTheme.typography.label, color = colors.inkPrimary)
    }
}

/** Remembers a value only for as long as the composition lives. */
@Composable
internal fun <T> rememberStable(value: T): T = remember { value }
