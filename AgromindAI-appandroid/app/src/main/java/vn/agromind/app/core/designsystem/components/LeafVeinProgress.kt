package vn.agromind.app.core.designsystem.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroMotion
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/**
 * "Bước 2/4", drawn as a leaf vein.
 *
 * Two accessibility decisions, both from `design/ACCESSIBILITY.md`:
 *
 * * **One focus stop, not four.** Only the current node is announced — "Bước 2
 *   trên 4: Xác nhận lá" — and the rest are cleared. A screen-reader user
 *   swiping through four decorative nodes on every step of a four-step flow is
 *   sixteen stops that tell them nothing.
 * * **Labels shorten at large font scales** rather than being clipped or given a
 *   `maxLines`. At 150%+ "Thêm dấu hiệu" becomes "Dấu hiệu" — still meaningful,
 *   still whole.
 *
 * Going back does not animate. Watching the fill retract reads as deliberate
 * regression; it should simply already be where it belongs.
 */
@Composable
fun LeafVeinProgress(
    step: Int,
    labels: List<String>,
    shortLabels: List<String> = labels,
    modifier: Modifier = Modifier,
) {
    val colors = AgroTheme.colors
    val total = labels.size
    val fontScale = LocalConfiguration.current.fontScale
    val useShort = fontScale >= 1.5f
    val shown = if (useShort) shortLabels else labels

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = AgroSpacing.xs),
        verticalAlignment = Alignment.Top,
    ) {
        shown.forEachIndexed { index, label ->
            val position = index + 1
            val done = position < step
            val current = position == step

            Column(
                modifier = Modifier
                    .weight(1f)
                    .then(
                        if (current) {
                            Modifier.semantics {
                                contentDescription = "Bước $step trên $total: ${labels[index]}"
                            }
                        } else {
                            Modifier.clearAndSetSemantics {}
                        },
                    ),
                horizontalAlignment = when (index) {
                    // First and last hug the edges so a long label at 200% has
                    // somewhere to go instead of overflowing the row.
                    0 -> Alignment.Start
                    shown.lastIndex -> Alignment.End
                    else -> Alignment.CenterHorizontally
                },
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    VeinNode(done = done, current = current, position = position)
                    if (index != shown.lastIndex) {
                        Vein(filled = position < step)
                    }
                }

                Text(
                    text = label,
                    style = AgroTheme.typography.label,
                    color = if (done || current) colors.inkPrimary else colors.inkSecondary,
                    textAlign = when (index) {
                        0 -> TextAlign.Start
                        shown.lastIndex -> TextAlign.End
                        else -> TextAlign.Center
                    },
                )
            }
        }
    }
}

@Composable
private fun VeinNode(done: Boolean, current: Boolean, position: Int) {
    val colors = AgroTheme.colors
    // The organic node shape: 50%/42% alternating, so it reads as a leaf tip
    // rather than as a circle in a stepper.
    val shape = remember { RoundedCornerShape(50, 42, 50, 42) }

    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(shape)
            .background(
                when {
                    done -> colors.leaf
                    current -> colors.softLeaf
                    else -> Color.Transparent
                },
            )
            .border(
                width = if (current) 2.dp else 1.dp,
                color = when {
                    done -> colors.leaf
                    current -> colors.leaf
                    else -> colors.divider
                },
                shape = shape,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (done) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(16.dp),
            )
        } else {
            Text(
                text = position.toString(),
                style = AgroTheme.typography.label,
                color = if (current) colors.leafStrong else colors.inkSecondary,
            )
        }
    }
}

@Composable
private fun Vein(filled: Boolean) {
    val colors = AgroTheme.colors
    val progress by animateFloatAsState(
        targetValue = if (filled) 1f else 0f,
        // Forward fills over 260ms; backward is instant. `snap` when the target
        // is 0 is what makes going back feel like a correction rather than a
        // rewind.
        animationSpec = if (filled) {
            tween(260, easing = AgroMotion.Standard)
        } else {
            snap()
        },
        label = "vein",
    )

    Box(
        Modifier
            .padding(horizontal = 4.dp)
            .widthIn(min = 12.dp)
            .width(28.dp)
            .height(2.dp)
            .background(colors.divider),
    ) {
        Box(
            Modifier
                .fillMaxWidth(progress)
                .height(2.dp)
                .background(colors.leaf),
        )
    }
}
