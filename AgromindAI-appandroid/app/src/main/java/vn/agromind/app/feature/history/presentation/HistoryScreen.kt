package vn.agromind.app.feature.history.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.paging.LoadState
import androidx.paging.PagingData
import androidx.paging.cachedIn
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.ConfidenceBand
import vn.agromind.app.core.designsystem.components.HistoryRow
import vn.agromind.app.core.designsystem.components.HistoryRowSkeleton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.feature.history.data.HistoryItem
import vn.agromind.app.feature.history.data.HistoryLoadError
import vn.agromind.app.feature.history.data.HistoryRepository
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    repository: HistoryRepository,
) : ViewModel() {
    // cachedIn keeps the loaded pages across configuration changes, so rotating
    // the phone does not re-fetch every page the grower already scrolled past.
    val items: Flow<PagingData<HistoryItem>> = repository.pages().cachedIn(viewModelScope)
}

/**
 * Lịch sử.
 *
 * The list never loads a full-size image — only `thumbnail_url` — and it never
 * shows a spinner in place of the whole screen once there is content: a refresh
 * that blanks out twenty rows the grower was reading is worse than a slightly
 * stale list.
 */
@Composable
fun HistoryScreen(
    contentPadding: PaddingValues,
    onOpen: (Int) -> Unit,
    onStartCheck: () -> Unit,
    viewModel: HistoryViewModel = hiltViewModel(),
) {
    val items = viewModel.items.collectAsLazyPagingItems()
    val refresh = items.loadState.refresh

    when {
        refresh is LoadState.Loading && items.itemCount == 0 -> {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(AgroSpacing.gutterCompact),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(6) { HistoryRowSkeleton() }
            }
        }

        refresh is LoadState.Error && items.itemCount == 0 -> {
            val error = (refresh.error as? HistoryLoadError)?.error
            StateBlock(
                art = StateArt.LeafLens,
                title = "Chưa tải được lịch sử",
                body = error?.message ?: "Bạn kiểm tra lại kết nối giúp mình nhé.",
                primary = StateAction("Thử lại") { items.retry() },
                supportCode = (error as? AgroError.Unexpected)?.code,
            )
        }

        items.itemCount == 0 -> StateBlock(
            art = StateArt.LeafLens,
            title = "Chưa có lần kiểm tra nào",
            body = "Mỗi lần bạn chụp một chiếc lá, kết quả sẽ được lưu ở đây để theo dõi vườn theo thời gian.",
            primary = StateAction("Kiểm tra ảnh lá", onStartCheck),
        )

        else -> LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = AgroSpacing.gutterCompact,
                end = AgroSpacing.gutterCompact,
                top = AgroSpacing.sm,
                bottom = contentPadding.calculateBottomPadding() + AgroSpacing.lg,
            ),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(count = items.itemCount) { index ->
                val item = items[index]
                if (item == null) {
                    HistoryRowSkeleton()
                } else {
                    HistoryRow(
                        thumbnailUrl = item.thumbnailUrl,
                        plantName = item.plantName,
                        diseaseName = item.diseaseName,
                        confidencePercent = item.confidencePercent,
                        band = bandOf(item.confidencePercent),
                        dateLabel = item.createdAt.take(10),
                        onClick = { onOpen(item.id) },
                    )
                }
            }

            when (val append = items.loadState.append) {
                is LoadState.Loading -> item { HistoryRowSkeleton() }
                is LoadState.Error -> item {
                    // Retry in place, not a whole-screen error: the rows already
                    // loaded are still good and the grower should keep them.
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        SecondaryButton(
                            label = (append.error as? HistoryLoadError)?.error?.message
                                ?.let { "Chưa tải thêm được · Thử lại" } ?: "Thử lại",
                            onClick = { items.retry() },
                        )
                    }
                }
                else -> Unit
            }
        }
    }
}

private fun bandOf(percent: Int?): ConfidenceBand = when {
    percent == null -> ConfidenceBand.Recheck
    percent >= 80 -> ConfidenceBand.High
    percent >= 55 -> ConfidenceBand.Watch
    else -> ConfidenceBand.Recheck
}
