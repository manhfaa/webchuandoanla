package vn.agromind.app.core.model

/**
 * The named stages a long server call moves through.
 *
 * Lives in `core/model` rather than in the diagnosis feature because
 * `StatusChain` renders it, and a shared design-system component must not
 * depend on a feature package — that inversion is what stops the same
 * component being reused by the crop-plan generator, which is equally slow and
 * equally in need of honest progress.
 *
 * Named stages instead of a percentage, because there is no percentage the app
 * honestly knows: a cold Hugging Face Space and a seven-stage research run have
 * no measurable progress, and a bar that crawls to 90% and stops is a lie that
 * makes people close the app.
 */
enum class LoadingStage(val label: String, val doneLabel: String) {
    Uploading("Đang tải ảnh lên an toàn", "Đã tải ảnh lên"),
    LeafCheck("Đang kiểm tra vùng lá", "Đã kiểm tra vùng lá"),
    SignAnalysis("Đang phân tích dấu hiệu trên lá", "Đã phân tích dấu hiệu"),
    SourceMatch("Đang đối chiếu với nguồn tham khảo", "Đã đối chiếu nguồn tham khảo"),
    PreparingActions("Đang chuẩn bị việc nên làm", "Đã chuẩn bị việc nên làm"),
}

/**
 * `SourceMatch` appears only when there is something to verify.
 *
 * Listing it for a grower who skipped the description would show a step that
 * never runs, and a checklist with a line that stays grey forever reads as a
 * failure.
 */
fun loadingStages(withResearch: Boolean): List<LoadingStage> =
    LoadingStage.entries.filter { withResearch || it != LoadingStage.SourceMatch }
