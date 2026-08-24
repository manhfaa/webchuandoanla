package vn.agromind.app.core.designsystem.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import vn.agromind.app.core.designsystem.AgroMotion
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.model.LeafRegion

/**
 * The photo, framed.
 *
 * The 20/40/20/40 corner shape is the one distinctive form in the product; it is
 * reserved for the diagnosis flow and the result screen, never used as
 * decoration elsewhere.
 *
 * Motion rules from `design/MOTION-SPEC.md`, all of which matter more than they
 * look:
 *
 * * The scan band passes **once**, in 1900ms. If the server has not answered by
 *   then the band stops and the StatusChain carries on reporting — a band that
 *   loops forever is a progress indicator that reports nothing while implying
 *   work, which is the exact lie a fake percentage tells.
 * * Markers appear staggered and then stop dead. No pulse, no blink, no
 *   travelling border. A leaf outline that keeps moving reads as "still
 *   working" long after the answer arrived.
 * * With reduced motion, everything renders in its final state immediately.
 *
 * The markers are announced as one group ("Đã tìm thấy 2 vùng lá trong ảnh")
 * rather than individually, because a screen-reader user does not need to hear
 * about each rectangle.
 */
@Composable
fun LeafLensFrame(
    imagePath: String?,
    modifier: Modifier = Modifier,
    regions: List<LeafRegion> = emptyList(),
    scanning: Boolean = false,
    rejected: Boolean = false,
    scrim: Boolean = false,
    aspectRatio: Float = 4f / 3f,
    contentDescription: String? = null,
) {
    val colors = AgroTheme.colors
    val reduceMotion = AgroTheme.reduceMotion
    val shape = AgroTheme.shapes.leafLens

    // One pass, driven by a target that flips once. Not an infinite transition:
    // that is the difference between "scanned" and "scanning forever".
    var scanTarget by remember(imagePath) { mutableStateOf(0f) }
    LaunchedEffect(imagePath, scanning, reduceMotion) {
        scanTarget = if (scanning && !reduceMotion) 1f else 0f
    }
    val scanProgress by animateFloatAsState(
        targetValue = scanTarget,
        animationSpec = tween(AgroMotion.ScanMs, easing = LinearEasing),
        label = "scan",
    )

    // Markers fade in staggered, then never move again.
    val markerProgress = remember(regions, reduceMotion) { mutableStateOf(if (reduceMotion) 1f else 0f) }
    LaunchedEffect(regions, reduceMotion) {
        if (reduceMotion || regions.isEmpty()) {
            markerProgress.value = 1f
        } else {
            // At most three animate; a fourth region appears without ceremony.
            repeat(minOf(regions.size, 3)) { index ->
                kotlinx.coroutines.delay(AgroMotion.MarkerStaggerMs.toLong())
                markerProgress.value = (index + 1f) / minOf(regions.size, 3)
            }
            markerProgress.value = 1f
        }
    }

    Box(
        modifier = modifier
            .aspectRatio(aspectRatio)
            .clip(shape)
            .background(colors.softLeaf)
            .border(1.dp, colors.divider, shape)
            .semantics {
                contentDescription?.let { this.contentDescription = it }
                if (scanning) liveRegion = LiveRegionMode.Polite
            },
    ) {
        if (imagePath != null) {
            AsyncImage(
                model = imagePath,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            )
        }

        Canvas(Modifier.fillMaxSize()) {
            if (scrim || rejected) {
                drawRect(
                    brush = Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = if (rejected) 0.42f else 0.0f),
                        1f to Color.Black.copy(alpha = if (rejected) 0.42f else 0.55f),
                    ),
                )
            }

            // Leaf regions, drawn from normalised coordinates so the overlay does
            // not need to know the upload resolution.
            val shown = markerProgress.value
            regions.forEachIndexed { index, region ->
                val visibility = ((shown * regions.size) - index).coerceIn(0f, 1f)
                if (visibility <= 0f) return@forEachIndexed
                drawRoundRect(
                    color = colors.leaf.copy(alpha = 0.9f * visibility),
                    topLeft = Offset(region.left * size.width, region.top * size.height),
                    size = Size(
                        (region.right - region.left) * size.width,
                        (region.bottom - region.top) * size.height,
                    ),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(10.dp.toPx()),
                    style = Stroke(width = 3.dp.toPx()),
                )
            }

            if (scanning && !reduceMotion && scanProgress > 0f && scanProgress < 1f) {
                val bandHeight = 74.dp.toPx()
                val y = (size.height + bandHeight) * scanProgress - bandHeight
                drawRect(
                    brush = Brush.verticalGradient(
                        0f to colors.leaf.copy(alpha = 0f),
                        0.5f to colors.leaf.copy(alpha = 0.5f),
                        1f to colors.leaf.copy(alpha = 0f),
                        startY = y,
                        endY = y + bandHeight,
                    ),
                    topLeft = Offset(0f, y),
                    size = Size(size.width, bandHeight),
                )
            }
        }
    }
}
