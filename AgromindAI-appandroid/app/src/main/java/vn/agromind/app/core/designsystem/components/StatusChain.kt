package vn.agromind.app.core.designsystem.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.model.LoadingStage

/**
 * Loading, told as the real sequence of things happening.
 *
 * There is no percentage anywhere, because there is no number the app honestly
 * knows: a Hugging Face Space cold start and a seven-stage research run have no
 * measurable progress, and a bar that crawls to 90% and waits is a lie that
 * makes people close the app. Named stages are the truth — "đang kiểm tra vùng
 * lá" is checkable, and the grower can see which part is slow.
 *
 * When a stage fails, only that line turns red. The lines after it stay grey
 * rather than also going red, because they never ran and marking them failed
 * would misreport where the problem is.
 *
 * Only the running line is a live region; announcing all five on every change
 * would talk over a TalkBack user continuously for the length of the call.
 */
@Composable
fun StatusChain(
    stages: List<LoadingStage>,
    current: LoadingStage?,
    modifier: Modifier = Modifier,
    failed: LoadingStage? = null,
) {
    val colors = AgroTheme.colors
    val currentIndex = current?.let(stages::indexOf) ?: -1
    val failedIndex = failed?.let(stages::indexOf) ?: -1

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        stages.forEachIndexed { index, stage ->
            val isFailed = index == failedIndex
            val isCurrent = index == currentIndex && !isFailed
            val isDone = when {
                failedIndex >= 0 -> index < failedIndex
                currentIndex >= 0 -> index < currentIndex
                else -> true
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .then(
                        if (isCurrent) {
                            Modifier.semantics {
                                liveRegion = LiveRegionMode.Polite
                                contentDescription = stage.label
                            }
                        } else if (isFailed) {
                            Modifier.semantics { contentDescription = "Lỗi ở bước: ${stage.label}" }
                        } else if (isDone) {
                            Modifier.semantics { contentDescription = stage.doneLabel }
                        } else {
                            // A step that has not started tells a screen-reader
                            // user nothing useful yet.
                            Modifier.clearAndSetSemantics {}
                        },
                    )
                    .alpha(if (!isDone && !isCurrent && !isFailed) 0.45f else 1f),
            ) {
                when {
                    isFailed -> Icon(
                        Icons.Outlined.ErrorOutline,
                        contentDescription = null,
                        tint = colors.danger,
                        modifier = Modifier.size(22.dp),
                    )
                    isCurrent -> CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = colors.leaf,
                    )
                    isDone -> Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = colors.leaf,
                        modifier = Modifier.size(22.dp),
                    )
                    else -> Icon(
                        Icons.Outlined.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = colors.inkSecondary,
                        modifier = Modifier.size(22.dp),
                    )
                }

                Spacer(Modifier.width(AgroSpacing.sm))

                Text(
                    text = if (isDone) stage.doneLabel else stage.label,
                    style = AgroTheme.typography.body.copy(
                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    ),
                    color = if (isFailed) colors.danger else colors.inkPrimary,
                )
            }
        }
    }
}
