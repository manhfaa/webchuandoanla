package vn.agromind.app.feature.garden.presentation

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.TraceabilityDto
import javax.inject.Inject

data class TraceabilityUiState(
    val loading: Boolean = true,
    val records: List<TraceabilityDto> = emptyList(),
    val cached: Boolean = false,
    val error: AgroError? = null,
)

@HiltViewModel
class TraceabilityViewModel @Inject constructor(
    private val api: FarmApi,
    private val cache: OfflineCache,
) : ViewModel() {
    private val _state = MutableStateFlow(TraceabilityUiState())
    val state: StateFlow<TraceabilityUiState> = _state.asStateFlow()
    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            cache.traceability()?.takeIf { it.isNotEmpty() }?.let {
                _state.value = TraceabilityUiState(loading = true, records = it, cached = true)
            }
            when (val result = ErrorMapper.guard { api.traceability() }) {
                is AgroResult.Ok -> {
                    cache.saveTraceability(result.value)
                    _state.value = TraceabilityUiState(loading = false, records = result.value)
                }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }
}

@Composable
fun TraceabilityScreen(onBack: () -> Unit, viewModel: TraceabilityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val colors = AgroTheme.colors

    if (!state.loading && state.records.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa có mã truy xuất",
            body = state.error?.message ?: "Khi lô vườn có mã truy xuất, QR sẽ xuất hiện ở đây để bạn chia sẻ.",
            primary = StateAction("Thử lại", viewModel::refresh),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.md),
    ) {
        TextButton(onClick = onBack) { Text("Quay lại") }
        Text("QR truy xuất nguồn gốc", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
        Text(
            if (state.cached) "Đang hiển thị dữ liệu đã lưu trên máy và cập nhật khi có mạng."
            else "Khách hàng quét mã để mở thông tin công khai của lô vườn.",
            style = AgroTheme.typography.body,
            color = colors.inkSecondary,
        )
        state.records.forEach { record ->
            Column(
                Modifier.fillMaxWidth().clip(AgroTheme.shapes.card).background(colors.surface)
                    .border(1.dp, colors.divider, AgroTheme.shapes.card).padding(AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    record.productName.ifBlank { record.plotName },
                    style = AgroTheme.typography.sectionTitle,
                    color = colors.inkPrimary,
                )
                Text(
                    listOf(record.plotName, record.cropType).filter { it.isNotBlank() }.joinToString(" · "),
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                AsyncImage(
                    model = record.qrImageUrl,
                    contentDescription = "Mã QR truy xuất ${record.productName.ifBlank { record.plotName }}",
                    modifier = Modifier.size(240.dp).clip(AgroTheme.shapes.card).background(colors.surface),
                    contentScale = ContentScale.Fit,
                )
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    SecondaryButton(
                        label = "Mở trang công khai",
                        modifier = Modifier.weight(1f),
                        enabled = record.publicUrl.isNotBlank(),
                        onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(record.publicUrl)))
                        },
                    )
                    SecondaryButton(
                        label = "Chia sẻ",
                        modifier = Modifier.weight(1f),
                        enabled = record.publicUrl.isNotBlank(),
                        onClick = {
                            context.startActivity(
                                Intent.createChooser(
                                    Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, record.publicUrl)
                                    },
                                    "Chia sẻ mã truy xuất",
                                ),
                            )
                        },
                    )
                }
            }
        }
    }
}
