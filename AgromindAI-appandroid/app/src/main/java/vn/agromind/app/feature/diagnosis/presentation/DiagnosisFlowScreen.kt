package vn.agromind.app.feature.diagnosis.presentation

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.LeafLensFrame
import vn.agromind.app.core.designsystem.components.LeafVeinProgress
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.designsystem.components.StatusChain
import vn.agromind.app.core.model.InputMethod
import vn.agromind.app.feature.diagnosis.domain.DiagnosisState
import vn.agromind.app.feature.diagnosis.domain.FlowStep

private val SYMPTOM_CHIPS = listOf(
    "Lá vàng từ chóp vào",
    "Có đốm nâu loang nước",
    "Mặt dưới lá có lớp mốc",
    "Lá xoăn lại",
    "Rụng lá nhiều",
    "Lan nhanh sang cây bên cạnh",
)

/**
 * The four-step leaf check, end to end.
 *
 * The screen renders the state machine and nothing else — every rule about what
 * may follow what lives in [DiagnosisViewModel], so a restored process, a
 * cancelled call and a fresh start all reach the same screen the same way.
 */
@Composable
fun DiagnosisFlowScreen(
    onOpenResult: (Int) -> Unit,
    onLeave: () -> Unit,
    onUpgrade: () -> Unit,
    viewModel: DiagnosisViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var showCamera by remember { mutableStateOf(false) }
    var showRationale by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(
        // Photo Picker, not `READ_MEDIA_IMAGES`. It needs no permission at all,
        // and asking a grower for access to their whole gallery so they can pick
        // one leaf photo is a request they are right to refuse.
        ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        uri?.let { viewModel.onPhotoPicked(it, InputMethod.Upload) }
    }

    val cameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            showCamera = true
        } else {
            // Refusing the camera is not a dead end: the picker is a complete
            // alternative, so the flow simply continues down it.
            picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
    }

    fun startCamera() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) showCamera = true else showRationale = true
    }

    if (showCamera) {
        CameraCaptureScreen(
            onCaptured = {
                showCamera = false
                viewModel.onPhotoPicked(it, InputMethod.Capture)
            },
            onCancel = { showCamera = false },
            onPickFromGallery = {
                showCamera = false
                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.md),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.md),
    ) {
        LeafVeinProgress(
            step = ui.step.number,
            labels = FlowStep.entries.map { it.label },
            shortLabels = FlowStep.entries.map { it.shortLabel },
        )

        when (val flow = ui.flow) {
            DiagnosisState.Draft -> PickPhotoStep(
                onCapture = ::startCamera,
                onPick = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
            )

            is DiagnosisState.PhotoReady -> PhotoPreviewStep(
                photoPath = flow.photo.path,
                originalBytes = flow.photo.originalBytes,
                uploadBytes = flow.photo.uploadBytes,
                onUse = viewModel::analyze,
                onRetake = viewModel::retakePhoto,
            )

            is DiagnosisState.Analyzing -> LoadingStep(
                photoPath = flow.photo.path,
                title = "Đang xem ảnh có vùng lá không",
                ui = ui,
                onCancel = viewModel::cancel,
            )

            is DiagnosisState.LeafRejected -> LeafRejectedStep(
                photoPath = flow.photo.path,
                onRetake = viewModel::retakePhoto,
                onLater = onLeave,
            )

            is DiagnosisState.AwaitingSymptoms -> SymptomsStep(
                photoPath = flow.photo.path,
                regionCount = flow.detection.regions.size,
                symptoms = flow.symptoms,
                onSymptomsChange = viewModel::onSymptomsChange,
                onSubmit = viewModel::submitSymptoms,
                onSkip = viewModel::skipSymptoms,
            )

            is DiagnosisState.Researching -> LoadingStep(
                photoPath = flow.photo.path,
                title = "Đang xem giúp bạn…",
                ui = ui,
                onCancel = viewModel::cancel,
            )

            is DiagnosisState.Finalizing -> LoadingStep(
                photoPath = flow.photo.path,
                title = "Đang xem giúp bạn…",
                ui = ui,
                onCancel = viewModel::cancel,
            )

            is DiagnosisState.Saved -> SavedStep(
                diagnosisId = flow.diagnosisId,
                onOpenResult = onOpenResult,
            )

            is DiagnosisState.FailedRetryable -> StateBlock(
                art = StateArt.LeafLens,
                title = "Chưa xong được bước này",
                // The photo and the description are still in the draft; saying
                // so is what stops the grower re-shooting a leaf they already
                // photographed.
                body = "${flow.error.message}\n\nẢnh và mô tả của bạn vẫn được giữ nguyên.",
                primary = StateAction("Thử lại", viewModel::retry),
                secondary = StateAction("Để sau", onLeave),
            )

            is DiagnosisState.FailedPermanent -> StateBlock(
                art = StateArt.LeafLens,
                title = if (flow.error is vn.agromind.app.core.common.AgroError.PlanLimit) {
                    "Bạn đã dùng hết lượt trong gói"
                } else {
                    "Chưa dùng được ảnh này"
                },
                body = flow.error.message,
                primary = if (flow.error is vn.agromind.app.core.common.AgroError.PlanLimit) {
                    StateAction("Xem gói dịch vụ", onUpgrade)
                } else {
                    StateAction("Chụp lại", viewModel::retakePhoto)
                },
                secondary = StateAction("Để sau", onLeave),
            )
        }
    }

    if (showRationale) {
        PermissionRationaleSheet(
            onDismiss = { showRationale = false },
            onAgree = {
                showRationale = false
                cameraPermission.launch(Manifest.permission.CAMERA)
            },
            onUseGallery = {
                showRationale = false
                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
        )
    }
}

/* --------------------------------------------------------------- step 1 --- */

@Composable
private fun PickPhotoStep(onCapture: () -> Unit, onPick: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
        Text(
            "Chụp chiếc lá đang có dấu hiệu lạ",
            style = AgroTheme.typography.screenTitle,
            color = AgroTheme.colors.inkPrimary,
        )
        listOf(
            "Chụp ngoài trời râm, tránh nắng gắt chiếu thẳng.",
            "Giữ máy cách lá khoảng một gang tay.",
            "Đặt lá trên nền trơn, tránh nhiều lá chồng lên nhau.",
        ).forEach {
            Text("• $it", style = AgroTheme.typography.body, color = AgroTheme.colors.inkSecondary)
        }

        Spacer(Modifier.height(AgroSpacing.xs))
        PrimaryButton(label = "Chụp ảnh", onClick = onCapture)
        SecondaryButton(label = "Chọn ảnh trong máy", onClick = onPick)
    }
}

@Composable
private fun PhotoPreviewStep(
    photoPath: String,
    originalBytes: Long,
    uploadBytes: Long,
    onUse: () -> Unit,
    onRetake: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
        LeafLensFrame(
            imagePath = photoPath,
            contentDescription = "Ảnh lá bạn vừa chọn",
            modifier = Modifier.fillMaxWidth(),
        )

        // Stated plainly because it is the grower's mobile data being spent, and
        // because it shows the app did something useful with their 4 MB photo.
        Text(
            text = "Ảnh gửi đi: ${uploadBytes.asKb()} (gốc ${originalBytes.asKb()}). " +
                "Ảnh giữ nguyên trong bộ nhớ tạm nếu app bị chuyển ra nền.",
            style = AgroTheme.typography.mono,
            color = AgroTheme.colors.inkSecondary,
        )

        PrimaryButton(label = "Dùng ảnh này", onClick = onUse)
        SecondaryButton(label = "Chụp lại", onClick = onRetake)
    }
}

/* --------------------------------------------------------------- step 2 --- */

@Composable
private fun LoadingStep(
    photoPath: String,
    title: String,
    ui: DiagnosisUiState,
    onCancel: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.md)) {
        LeafLensFrame(
            imagePath = photoPath,
            scanning = true,
            contentDescription = "Đang kiểm tra vùng lá trong ảnh",
            modifier = Modifier.fillMaxWidth(),
        )
        Text(title, style = AgroTheme.typography.sectionTitle, color = AgroTheme.colors.inkPrimary)
        StatusChain(stages = ui.stages, current = ui.stage, failed = ui.failedStage)
        // Always a full-size button, never a small icon: this is the escape
        // hatch from a call that can legitimately take ninety seconds.
        SecondaryButton(label = "Huỷ", onClick = onCancel)
    }
}

@Composable
private fun LeafRejectedStep(photoPath: String, onRetake: () -> Unit, onLater: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
        LeafLensFrame(
            imagePath = photoPath,
            rejected = true,
            contentDescription = "Ảnh chưa thấy rõ vùng lá",
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            "Mình chưa thấy rõ chiếc lá trong ảnh này",
            style = AgroTheme.typography.sectionTitle,
            color = AgroTheme.colors.inkPrimary,
        )
        // Not the grower's fault, and said so. A rejection that reads as blame
        // is how someone decides the app does not work for them.
        Text(
            "Không phải lỗi của bạn. Thường là do lá ở quá xa, ảnh bị rung, hoặc trong khung có nhiều thứ khác.",
            style = AgroTheme.typography.body,
            color = AgroTheme.colors.inkSecondary,
        )
        Text("THỬ LẠI NHƯ VẦY", style = AgroTheme.typography.label, color = AgroTheme.colors.leafStrong)
        listOf(
            "Đưa máy lại gần hơn, để lá chiếm phần lớn khung.",
            "Tì tay vào thân cây hoặc gối lên vật cố định cho đỡ rung.",
            "Chọn một chiếc lá, tránh chụp cả chùm.",
        ).forEach {
            Text("• $it", style = AgroTheme.typography.body, color = AgroTheme.colors.inkSecondary)
        }

        Spacer(Modifier.height(AgroSpacing.xs))
        PrimaryButton(label = "Chụp lại", onClick = onRetake)
        SecondaryButton(label = "Để sau", onClick = onLater)
    }
}

/* --------------------------------------------------------------- step 3 --- */

@Composable
private fun SymptomsStep(
    photoPath: String,
    regionCount: Int,
    symptoms: String,
    onSymptomsChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onSkip: () -> Unit,
) {
    val colors = AgroTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
        // States what is actually known: a valid leaf photo. Not "đã chẩn đoán".
        Text(
            text = "Ảnh lá hợp lệ · Đã tìm thấy $regionCount vùng lá trong ảnh",
            style = AgroTheme.typography.label,
            color = colors.leafStrong,
        )
        LeafLensFrame(
            imagePath = photoPath,
            contentDescription = null,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(
            "Bạn thấy cây có dấu hiệu gì?",
            style = AgroTheme.typography.screenTitle,
            color = colors.inkPrimary,
        )
        Text(
            "Kể thêm vài câu thì kết luận sẽ sát hơn. Không có gì để kể cũng không sao.",
            style = AgroTheme.typography.body,
            color = colors.inkSecondary,
        )

        OutlinedTextField(
            value = symptoms,
            onValueChange = onSymptomsChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(132.dp),
            placeholder = { Text("Ví dụ: lá vàng từ chóp vào, có đốm nâu loang nước…") },
        )

        SuggestionChips(
            chips = SYMPTOM_CHIPS,
            selected = SYMPTOM_CHIPS.filter { symptoms.contains(it) },
            onAdd = { chip ->
                val next = if (symptoms.isBlank()) chip else "$symptoms, $chip"
                onSymptomsChange(next)
            },
        )

        Spacer(Modifier.height(AgroSpacing.xs))
        PrimaryButton(label = "Xem kết quả", onClick = onSubmit)
        // Same type size and weight as the primary. Skipping is a real choice,
        // not something to be nudged away from.
        SecondaryButton(label = "Bỏ qua bước này", onClick = onSkip)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SuggestionChips(chips: List<String>, selected: List<String>, onAdd: (String) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        modifier = Modifier.fillMaxWidth(),
    ) {
        chips.forEach { chip ->
            val isSelected = chip in selected
            FilterChip(
                selected = isSelected,
                onClick = { if (!isSelected) onAdd(chip) },
                label = { Text(chip, style = AgroTheme.typography.label) },
                shape = AgroTheme.shapes.chip,
                modifier = Modifier
                    .heightIn(min = 44.dp)
                    .semantics {
                        // Says what tapping does, and what already happened.
                        // "Lá vàng từ chóp vào" alone tells a TalkBack user
                        // nothing about whether it is a button or a result.
                        contentDescription =
                            if (isSelected) "$chip, đã thêm" else "$chip, thêm vào mô tả"
                    },
            )
        }
    }
}

/* --------------------------------------------------------------- step 4 --- */

@Composable
private fun SavedStep(diagnosisId: Int, onOpenResult: (Int) -> Unit) {
    // The record exists on the server now; the flow hands over to the result
    // screen, which reads it by id rather than being passed a payload.
    LaunchedEffect(diagnosisId) { onOpenResult(diagnosisId) }
    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
        Text(
            "Đã lưu kết quả",
            style = AgroTheme.typography.sectionTitle,
            color = AgroTheme.colors.inkPrimary,
        )
    }
}

/* ------------------------------------------------------------ permission --- */

/**
 * Shown **before** the system dialog, never after.
 *
 * Android gives one chance at the system prompt and remembers a refusal. A
 * grower who sees "Cho phép truy cập máy ảnh?" with no idea why is right to say
 * no, and the app has then lost the camera permanently. Explaining first is what
 * makes the answer informed — and the sheet always offers the picker, so saying
 * no still leads somewhere.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PermissionRationaleSheet(
    onDismiss: () -> Unit,
    onAgree: () -> Unit,
    onUseGallery: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(),
        shape = AgroTheme.shapes.sheet,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(AgroSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
        ) {
            Text(
                "Cho mình mượn máy ảnh để xem lá nhé",
                style = AgroTheme.typography.sectionTitle,
                color = AgroTheme.colors.inkPrimary,
            )
            Text(
                "Ảnh chỉ dùng để tìm vùng lá và nhận diện dấu hiệu bệnh. Ảnh không được lưu vào thư viện máy, " +
                    "và bạn có thể xoá bất cứ lúc nào trong phần cài đặt.",
                style = AgroTheme.typography.body,
                color = AgroTheme.colors.inkSecondary,
            )
            PrimaryButton(label = "Đồng ý, mở máy ảnh", onClick = onAgree)
            SecondaryButton(label = "Chọn ảnh trong máy", onClick = onUseGallery)
        }
    }
}

private fun Long.asKb(): String = when {
    this <= 0 -> "—"
    this < 1024 * 1024 -> "${this / 1024} KB"
    else -> String.format("%.1f MB", this / 1024.0 / 1024.0)
}
