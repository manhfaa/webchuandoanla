package vn.agromind.app.feature.diagnosis.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import vn.agromind.app.core.model.InputMethod
import vn.agromind.app.feature.diagnosis.domain.LocalPhoto
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max
import kotlin.math.roundToInt

/** The photo is not something the model can read. Maps to a "chụp lại" screen. */
class UnreadablePhoto(message: String) : Exception(message)

/**
 * Gets a photo from the camera or the picker into a shape worth uploading.
 *
 * The numbers here are a deliberate trade, not defaults:
 *
 * * **Long edge 1800px.** Leaf disease is diagnosed from lesion edges and
 *   texture, which survive this; going lower starts to smooth exactly the detail
 *   the model needs. Going higher costs the grower mobile data on a connection
 *   that is often 3G in a field, for pixels the model downsamples anyway.
 * * **JPEG 85.** Above ~88 the file grows fast for differences invisible to the
 *   model; below ~82 compression artefacts start to look like lesion speckle.
 *
 * Both belong in one place so they can be measured against the real model and
 * changed once — not re-guessed at each call site.
 *
 * Two things this does that are easy to forget and expensive to miss:
 *
 * * **EXIF rotation is baked in.** A phone writes the sensor image plus an
 *   orientation tag; a server that ignores the tag sees a sideways leaf. Since
 *   the tag is stripped below, the rotation must be applied to the pixels first.
 * * **Metadata is dropped.** A camera photo carries GPS coordinates. Uploading a
 *   grower's exact plot location as a side effect of asking about a leaf is not
 *   something they agreed to, and the app already asks for a farm location
 *   explicitly when it needs one. Re-encoding through Bitmap keeps only the
 *   pixels.
 */
@Singleton
class ImagePreprocessor @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    suspend fun prepare(uri: Uri, inputMethod: InputMethod): LocalPhoto = withContext(Dispatchers.IO) {
        val originalBytes = context.contentResolver.openAssetFileDescriptor(uri, "r")
            ?.use { it.length.coerceAtLeast(0) } ?: 0L

        // Two passes. The first reads only the header to learn the real size, so
        // a 12 MP original never has to exist as a full bitmap in memory —
        // decoding one on a low-end phone is a reliable way to OOM.
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        openStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw UnreadablePhoto("Mình chưa mở được ảnh này. Bạn chọn ảnh khác giúp mình nhé.")
        }

        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight)
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = openStream(uri).use { BitmapFactory.decodeStream(it, null, decodeOptions) }
            ?: throw UnreadablePhoto("Mình chưa đọc được ảnh này. Bạn chụp lại giúp mình nhé.")

        val rotation = openStream(uri).use { ExifInterface(it).rotationDegrees() }
        val upright = decoded.applyRotation(rotation)
        val scaled = upright.scaleLongEdgeTo(MAX_LONG_EDGE)

        val target = File(cacheDir(), "leaf-${System.currentTimeMillis()}.jpg")
        FileOutputStream(target).use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
        }
        val outWidth = scaled.width
        val outHeight = scaled.height

        // Freed eagerly: on a 2GB phone the next screen may be a camera preview,
        // and waiting for GC to notice is how that stutters.
        if (scaled !== upright) upright.recycle()
        if (upright !== decoded) decoded.recycle()
        scaled.recycle()

        LocalPhoto(
            path = target.absolutePath,
            originalBytes = originalBytes,
            uploadBytes = target.length(),
            width = outWidth,
            height = outHeight,
            inputMethod = inputMethod,
        )
    }

    /**
     * The photo as a data URL, for the one call that has to persist it.
     *
     * The inference route takes the file as multipart precisely to avoid base64,
     * and that is the call worth optimising: it runs on every check, including
     * the ones the grower abandons. Saving is different — it happens once, only
     * for a result they decided to keep, and `Diagnosis.image_data_url` is where
     * the website already stores the image, so a record saved from the app and
     * one saved from the browser stay the same shape.
     *
     * Replacing both with object storage and a URL is the right long-term fix
     * and is a server change, not an app one.
     */
    suspend fun asDataUrl(photo: LocalPhoto): String = withContext(Dispatchers.IO) {
        val bytes = File(photo.path).readBytes()
        "data:image/jpeg;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
    }

    /**
     * A ~20 KB square-ish copy for the history list.
     *
     * The list must never pull the full image: at 20 rows that is megabytes of
     * base64 decoded on the scroll thread, on a phone, over mobile data. The
     * server stores this separately as `thumbnail_url` for exactly that reason.
     */
    suspend fun thumbnailDataUrl(photo: LocalPhoto): String = withContext(Dispatchers.IO) {
        val full = BitmapFactory.decodeFile(photo.path)
            ?: throw UnreadablePhoto("Mình chưa đọc lại được ảnh vừa chụp.")
        val thumb = full.scaleLongEdgeTo(THUMBNAIL_LONG_EDGE)
        val out = java.io.ByteArrayOutputStream()
        thumb.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, out)
        if (thumb !== full) full.recycle()
        thumb.recycle()
        "data:image/jpeg;base64," + android.util.Base64.encodeToString(
            out.toByteArray(),
            android.util.Base64.NO_WRAP,
        )
    }

    /** Drops the working copies. Called on logout, account deletion and cache clear. */
    fun clearCache() {
        cacheDir().listFiles()?.forEach { it.delete() }
    }

    /** Removes one working copy once its result is saved or discarded. */
    fun discard(photo: LocalPhoto) {
        runCatching { File(photo.path).delete() }
    }

    private fun cacheDir(): File =
        // Private cache, not external storage and not MediaStore: an unsaved
        // working copy of a leaf photo has no business appearing in the gallery.
        File(context.cacheDir, "leaf-checks").apply { mkdirs() }

    private fun openStream(uri: Uri): InputStream =
        context.contentResolver.openInputStream(uri)
            ?: throw UnreadablePhoto("Mình chưa mở được ảnh này. Bạn chọn ảnh khác giúp mình nhé.")

    private fun sampleSizeFor(width: Int, height: Int): Int {
        var sample = 1
        // Halve until the next halving would go below the target, so the decoded
        // bitmap is at most 2x the size we want — enough headroom for a clean
        // scale, without decoding the full original.
        while (max(width, height) / (sample * 2) >= MAX_LONG_EDGE) sample *= 2
        return sample
    }

    private fun ExifInterface.rotationDegrees(): Int = when (
        getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    ) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
    }

    private fun Bitmap.applyRotation(degrees: Int): Bitmap {
        if (degrees == 0) return this
        val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
        return Bitmap.createBitmap(this, 0, 0, width, height, matrix, true)
    }

    private fun Bitmap.scaleLongEdgeTo(target: Int): Bitmap {
        val longEdge = max(width, height)
        // Never upscale. A 900px photo enlarged to 1800px carries no more
        // information and doubles the upload for nothing.
        if (longEdge <= target) return this
        val ratio = target.toFloat() / longEdge
        return Bitmap.createScaledBitmap(
            this,
            (width * ratio).roundToInt().coerceAtLeast(1),
            (height * ratio).roundToInt().coerceAtLeast(1),
            true,
        )
    }

    companion object {
        /**
         * Measured against the current model before being fixed here. Changing
         * it is a decision to re-measure, not a tuning knob.
         */
        const val MAX_LONG_EDGE = 1800
        const val JPEG_QUALITY = 85

        const val THUMBNAIL_LONG_EDGE = 320
        const val THUMBNAIL_QUALITY = 70
    }
}
