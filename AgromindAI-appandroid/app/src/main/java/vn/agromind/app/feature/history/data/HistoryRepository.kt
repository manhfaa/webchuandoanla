package vn.agromind.app.feature.history.data

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.PagingSource
import androidx.paging.PagingState
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.DiagnosisApi
import vn.agromind.app.core.network.dto.DiagnosisDto
import vn.agromind.app.core.network.dto.UsageDto
import javax.inject.Inject
import javax.inject.Singleton

/** One row of the history list. */
@Serializable
data class HistoryItem(
    val id: Int,
    /**
     * The small image, and only the small image.
     *
     * Never `image_url` and never a base64 data URL: twenty rows of full-size
     * photos is megabytes decoded on a scroll, on a phone, usually over mobile
     * data. The server stores a separate thumbnail for exactly this.
     */
    val thumbnailUrl: String,
    val plantName: String,
    val diseaseName: String,
    val confidencePercent: Int?,
    val isLeaf: Boolean,
    val createdAt: String,
    val beyondRetention: Boolean,
)

@Singleton
class HistoryRepository @Inject constructor(
    private val api: DiagnosisApi,
    private val cache: OfflineCache,
) {

    fun pages(): Flow<PagingData<HistoryItem>> = Pager(
        config = PagingConfig(
            pageSize = PAGE_SIZE,
            // Small prefetch and a bounded cache: the list is scrolled outdoors
            // on a phone that is also running the camera, and holding hundreds
            // of rows plus their bitmaps in memory is how that gets killed.
            prefetchDistance = 6,
            maxSize = PAGE_SIZE * 5,
            enablePlaceholders = false,
        ),
        pagingSourceFactory = { DiagnosisPagingSource(api, cache) },
    ).flow

    suspend fun usage(): AgroResult<UsageDto> = ErrorMapper.guard { api.usage() }

    private companion object {
        const val PAGE_SIZE = 20
    }
}

/**
 * Paging over the diagnoses list route.
 *
 * That route hand-rolls limit/offset and returns `next_offset` rather than DRF's
 * `next` URL, so the key here is the offset itself. `next_offset` being null is
 * the end of the list — not an error, and not something to retry.
 */
private class DiagnosisPagingSource(
    private val api: DiagnosisApi,
    private val cache: OfflineCache,
) : PagingSource<Int, HistoryItem>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, HistoryItem> {
        val offset = params.key ?: 0
        return when (val result = ErrorMapper.guard { api.history(limit = params.loadSize, offset = offset) }) {
            is AgroResult.Ok -> {
                val rows = result.value.results.map { it.toHistoryItem() }
                if (offset == 0) cache.saveHistory(rows)
                LoadResult.Page(
                    data = rows,
                    prevKey = if (offset == 0) null else (offset - params.loadSize).coerceAtLeast(0),
                    nextKey = result.value.nextOffset,
                )
            }
            // Paging wants a Throwable. The typed error is carried on it so the
            // list footer can still tell "mất mạng" from "hết hạn mức" and offer
            // the right action instead of a bare "thử lại".
            is AgroResult.Err -> {
                val cached = if (offset == 0) cache.history().orEmpty() else emptyList()
                if (cached.isNotEmpty()) LoadResult.Page(cached, prevKey = null, nextKey = null)
                else LoadResult.Error(HistoryLoadError(result.error))
            }
        }
    }

    override fun getRefreshKey(state: PagingState<Int, HistoryItem>): Int? =
        state.anchorPosition?.let { anchor ->
            state.closestPageToPosition(anchor)?.prevKey?.plus(state.config.pageSize)
                ?: state.closestPageToPosition(anchor)?.nextKey?.minus(state.config.pageSize)
        }
}

/** Carries an [vn.agromind.app.core.common.AgroError] through Paging's Throwable API. */
class HistoryLoadError(val error: vn.agromind.app.core.common.AgroError) : Exception(error.message)

private fun DiagnosisDto.toHistoryItem() = HistoryItem(
    id = id,
    thumbnailUrl = thumbnailUrl,
    plantName = plantName,
    diseaseName = diseaseName,
    confidencePercent = (cnnConfidence * 100).toInt().takeIf { it > 0 && diseaseName.isNotBlank() },
    isLeaf = isLeaf,
    createdAt = createdAt,
    beyondRetention = beyondRetention,
)
