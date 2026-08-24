package vn.agromind.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme

/**
 * One saved leaf check in the history list.
 *
 * Announced as a single sentence — "Cà chua, nghi mốc sương, độ tin cậy 88 phần
 * trăm, cần theo dõi, ngày 31 tháng 7" — rather than as five separate nodes. A
 * TalkBack user swiping a list of twenty results should hear twenty rows, not a
 * hundred fragments.
 *
 * There is no `maxLines` on the plant or the disease name. At 200% font a
 * clipped "Sầu riên…" is worse than a taller row.
 */
@Composable
fun HistoryRow(
    thumbnailUrl: String,
    plantName: String,
    diseaseName: String,
    confidencePercent: Int?,
    band: ConfidenceBand,
    dateLabel: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AgroTheme.colors
    val bandLabel = when (band) {
        ConfidenceBand.High -> "Tin cậy cao"
        ConfidenceBand.Watch -> "Cần theo dõi"
        ConfidenceBand.Recheck -> "Nên kiểm tra lại"
    }
    val bandColor = when (band) {
        ConfidenceBand.High -> colors.leaf
        ConfidenceBand.Watch -> colors.sun
        ConfidenceBand.Recheck -> colors.info
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .clickable(onClick = onClick)
            .padding(AgroSpacing.sm)
            .heightIn(min = 64.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = buildString {
                    append(plantName.ifBlank { "Chưa rõ cây" })
                    if (diseaseName.isNotBlank()) append(", nghi $diseaseName")
                    confidencePercent?.let { append(", độ tin cậy $it phần trăm") }
                    append(", $bandLabel, $dateLabel")
                }
            },
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(colors.softLeaf),
        ) {
            if (thumbnailUrl.isNotBlank()) {
                AsyncImage(
                    model = thumbnailUrl,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                )
            }
        }

        Spacer(Modifier.width(AgroSpacing.sm))

        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                plantName.ifBlank { "Chưa rõ cây" },
                style = AgroTheme.typography.bodyStrong,
                color = colors.inkPrimary,
            )
            Text(
                diseaseName.ifBlank { "Chưa có kết quả phân loại" },
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
            Text(bandLabel, style = AgroTheme.typography.label, color = bandColor)
        }

        Spacer(Modifier.width(AgroSpacing.xs))

        Column(horizontalAlignment = Alignment.End) {
            Text(
                confidencePercent?.let { "$it%" } ?: "—",
                style = AgroTheme.typography.sectionTitle,
                color = colors.inkPrimary,
            )
            Text(dateLabel, style = AgroTheme.typography.label, color = colors.inkSecondary)
        }
    }
}

/**
 * The loading placeholder, shaped like the row it stands in for.
 *
 * Static blocks, no shimmer: a travelling highlight is harder to read in
 * sunlight than a plain block, and it keeps the GPU busy on a phone whose
 * battery has to last the working day.
 */
@Composable
fun HistoryRowSkeleton(modifier: Modifier = Modifier) {
    val colors = AgroTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .padding(AgroSpacing.sm),
    ) {
        Box(
            Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(colors.softLeaf),
        )
        Spacer(Modifier.width(AgroSpacing.sm))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(0.7f, 0.9f, 0.4f).forEach { fraction ->
                Box(
                    Modifier
                        .fillMaxWidth(fraction)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(colors.softLeaf),
                )
            }
        }
    }
}
