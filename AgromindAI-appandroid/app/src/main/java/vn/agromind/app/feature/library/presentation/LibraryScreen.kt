package vn.agromind.app.feature.library.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.AgriculturalInputDto
import javax.inject.Inject

private val CATEGORIES = listOf(
    "" to "Tất cả",
    "fertilizer" to "Phân bón",
    "pesticide" to "Thuốc BVTV",
    "biological" to "Chế phẩm sinh học",
)

data class LibraryUiState(
    val loading: Boolean = true,
    val query: String = "",
    val category: String = "",
    val items: List<AgriculturalInputDto> = emptyList(),
    val error: AgroError? = null,
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val api: FarmApi,
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryUiState())
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    private val queryFlow = MutableStateFlow("")

    @OptIn(FlowPreview::class)
    private val debounced = queryFlow.debounce(350).distinctUntilChanged()

    init {
        viewModelScope.launch { debounced.collect { search() } }
    }

    fun onQuery(value: String) {
        _state.update { it.copy(query = value) }
        // 350ms: long enough that a one-handed typist does not fire a request per
        // character on a field connection, short enough to feel immediate.
        queryFlow.value = value
    }

    fun onCategory(value: String) {
        _state.update { it.copy(category = value) }
        search()
    }

    fun search() {
        val current = _state.value
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val result = ErrorMapper.guard {
                api.inputLibrary(
                    query = current.query.trim().takeIf { it.isNotBlank() },
                    category = current.category.takeIf { it.isNotBlank() },
                )
            }
            when (result) {
                is AgroResult.Ok -> _state.update { it.copy(loading = false, items = result.value) }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }
}

/**
 * Thư viện vật tư.
 *
 * Read-only on purpose. This screen tells a grower what a product is and what to
 * be careful about; it does not recommend one, and it never turns a diagnosis
 * into a shopping list. Anything with a `warning` gets a visible danger tag and
 * the line about asking a local technician — a withholding period ignored is a
 * harvest that cannot be sold.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LibraryScreen(
    onBack: () -> Unit,
    viewModel: LibraryViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    Column(
        Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Thư viện vật tư", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        OutlinedTextField(
            value = ui.query,
            onValueChange = viewModel::onQuery,
            label = { Text("Tìm theo tên hoặc hoạt chất") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        ) {
            CATEGORIES.forEach { (slug, label) ->
                FilterChip(
                    selected = ui.category == slug,
                    onClick = { viewModel.onCategory(slug) },
                    label = { Text(label, style = AgroTheme.typography.label) },
                    shape = AgroTheme.shapes.chip,
                    modifier = Modifier.heightIn(min = 46.dp),
                )
            }
        }

        when {
            ui.error != null && ui.items.isEmpty() -> StateBlock(
                art = StateArt.None,
                title = "Chưa tải được thư viện",
                body = ui.error!!.message,
                primary = StateAction("Thử lại", viewModel::search),
                secondary = StateAction("Quay lại", onBack),
            )

            !ui.loading && ui.items.isEmpty() -> StateBlock(
                art = StateArt.None,
                title = "Không tìm thấy vật tư nào",
                body = "Bạn thử từ khoá khác hoặc bỏ bớt bộ lọc giúp mình nhé.",
                primary = StateAction("Xoá tìm kiếm") { viewModel.onQuery("") },
            )

            else -> ui.items.forEach { item -> InputCard(item) }
        }
    }
}

@Composable
private fun InputCard(item: AgriculturalInputDto) {
    val colors = AgroTheme.colors
    val needsCare = item.warning.isNotBlank() || item.withholdingPeriodDays != null

    Column(
        Modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .padding(AgroSpacing.md),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(item.name, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
        if (item.activeIngredient.isNotBlank()) {
            Text(
                "Hoạt chất: ${item.activeIngredient}",
                style = AgroTheme.typography.label,
                color = colors.inkSecondary,
            )
        }
        if (item.usage.isNotBlank()) {
            Text(item.usage, style = AgroTheme.typography.body, color = colors.inkSecondary)
        }
        item.withholdingPeriodDays?.let {
            Text(
                "Thời gian cách ly: $it ngày trước khi thu hoạch",
                style = AgroTheme.typography.bodyStrong,
                color = colors.soil,
            )
        }
        item.safetyNotes.forEach {
            Text("• $it", style = AgroTheme.typography.body, color = colors.inkSecondary)
        }
        if (needsCare) {
            Text("CẦN THẬN TRỌNG", style = AgroTheme.typography.label, color = colors.danger)
            Text(
                item.warning.ifBlank {
                    "Chỉ dùng theo hướng dẫn của cán bộ kỹ thuật địa phương."
                },
                style = AgroTheme.typography.body,
                color = colors.inkPrimary,
            )
        }
    }
}
