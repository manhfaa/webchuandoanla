package vn.agromind.app.feature.diagnosis.presentation

import android.content.Context
import android.net.Uri
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * In-app capture, rather than handing off to the system camera app.
 *
 * The handoff would be less code, but it loses the two things this screen exists
 * for: a framing guide sized to what the model actually wants, and control over
 * capture quality. It also loses the grower — a third-party camera UI in the
 * middle of a four-step flow breaks the sense of being in one task.
 *
 * The guide is drawn as an overlay and **nothing is cropped to it**. Cropping on
 * the client would throw away pixels the leaf detector might have used, and it
 * would mean the region boxes the server sends back no longer line up with the
 * photo the grower saw.
 */
@Composable
fun CameraCaptureScreen(
    onCaptured: (Uri) -> Unit,
    onCancel: () -> Unit,
    onPickFromGallery: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val colors = AgroTheme.colors

    val imageCapture = remember {
        ImageCapture.Builder()
            // Quality over latency: a smeared frame from a hand moving in a
            // breeze is the single most common reason the leaf check fails, and
            // one extra moment of shutter lag is cheaper than a retake.
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .build()
    }
    val previewView = remember { PreviewView(context).apply { scaleType = PreviewView.ScaleType.FILL_CENTER } }

    LaunchedEffect(Unit) {
        val provider = context.cameraProvider()
        val preview = Preview.Builder().build().apply { surfaceProvider = previewView.surfaceProvider }
        provider.unbindAll()
        provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture)
    }

    DisposableEffect(Unit) {
        onDispose {
            // Released explicitly: leaving the camera bound while the grower
            // reads the result screen holds the sensor open and drains a battery
            // that has to last the rest of the day in the field.
            runCatching { ProcessCameraProvider.getInstance(context).get().unbindAll() }
        }
    }

    var capturing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Box(
        modifier
            .fillMaxSize()
            .background(colors.forest)
            .safeDrawingPadding(),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(AgroSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.md),
        ) {
            Text(
                "Đưa lá vào giữa khung",
                style = AgroTheme.typography.sectionTitle,
                color = colors.onForest,
            )
            Text(
                "Chụp ngoài trời râm là rõ nhất. Giữ máy cách lá khoảng một gang tay.",
                style = AgroTheme.typography.body,
                color = colors.mint,
            )

            Box(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 4f)
                    .clip(AgroTheme.shapes.leafLens),
            ) {
                AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
                // The guide only. Capture keeps the full frame.
                Box(
                    Modifier
                        .fillMaxSize()
                        .border(2.dp, Color.White.copy(alpha = 0.65f), AgroTheme.shapes.leafLens),
                )
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.Bottom,
            ) {
                PrimaryButton(
                    label = "Chụp ảnh",
                    loadingLabel = "Đang chụp…",
                    loading = capturing,
                    onClick = {
                        capturing = true
                        scope.launch {
                            runCatching { imageCapture.captureTo(context) }
                                .onSuccess { onCaptured(it) }
                            capturing = false
                        }
                    },
                )
                Spacer(Modifier.size(AgroSpacing.xs))
                SecondaryButton(label = "Chọn ảnh trong máy", onClick = onPickFromGallery)
                Spacer(Modifier.size(AgroSpacing.xs))
                TextButton(
                    onClick = onCancel,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text(
                        "Để sau",
                        style = AgroTheme.typography.bodyStrong,
                        color = colors.mint,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

/** CameraX's ListenableFuture, as a suspend call. */
private suspend fun Context.cameraProvider(): ProcessCameraProvider =
    suspendCancellableCoroutine { continuation ->
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener(
            { continuation.resume(future.get()) },
            ContextCompat.getMainExecutor(this),
        )
    }

/** Writes into the app's private cache; the photo never enters the gallery. */
private suspend fun ImageCapture.captureTo(context: Context): Uri =
    suspendCancellableCoroutine { continuation ->
        val dir = File(context.cacheDir, "captures").apply { mkdirs() }
        val file = File(dir, "capture-${System.currentTimeMillis()}.jpg")
        val options = ImageCapture.OutputFileOptions.Builder(file).build()

        takePicture(
            options,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    continuation.resume(Uri.fromFile(file))
                }

                override fun onError(exception: ImageCaptureException) {
                    continuation.resumeWithException(exception)
                }
            },
        )
    }
