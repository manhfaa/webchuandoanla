export type Tr = (vi: string, en: string) => string;

/** Activity codes accepted by the cultivation-log API, in the order shown to the grower. */
export const ACTIVITY_TYPES = [
  "watering",
  "fertilizing",
  "pesticide",
  "disease_check",
  "pruning",
  "harvest",
  "note",
] as const;

export function activityLabel(type: string, tr: Tr) {
  const labels: Record<string, string> = {
    watering: tr("Tưới nước", "Watering"),
    fertilizing: tr("Bón phân", "Fertilizing"),
    pesticide: tr("Phun thuốc", "Spraying"),
    disease_check: tr("Kiểm tra sâu bệnh", "Pest and disease check"),
    pruning: tr("Tỉa cành", "Pruning"),
    harvest: tr("Thu hoạch", "Harvest"),
    note: tr("Ghi chú", "Note"),
  };
  return labels[type] ?? type;
}

/**
 * A field record is a typo when it lands before 2000 or more than a season into
 * the future, so the date inputs refuse those outright.
 */
export const EARLIEST_FARM_DATE = "2000-01-01";

export function latestFarmDate() {
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() + 1);
  return limit.toISOString().slice(0, 10);
}
