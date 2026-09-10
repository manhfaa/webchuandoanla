/**
 * Numbers the landing page quotes about the recognition model.
 *
 * Source: the production Space's /health response (classes=89,
 * model_accuracy=0.9530 on the validation split, ConvNeXt Tiny epoch 21),
 * recorded in CLAUDE.md §3. Update both values together when a new checkpoint
 * is deployed; a landing page quoting a stale accuracy is worse than none.
 *
 * The accuracy is always shown with "trên tập ảnh kiểm định" beside it. It is a
 * validation-set figure, not a promise about a photo taken in the field, and the
 * copy must never let it read as one.
 */
export const CLASS_COUNT = 89;

/** Formatted for display; Vietnamese decimal comma. */
export const VALIDATION_ACCURACY = "95,3%";
export const VALIDATION_ACCURACY_EN = "95.3%";
