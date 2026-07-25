/**
 * Backend content is Vietnamese-first: the English column is optional and is
 * empty for every row created before the bilingual rollout. Always fall back
 * to the Vietnamese value.
 */
export function pickText(vi: string, en: string | null | undefined, isEnglish: boolean) {
  if (!isEnglish) return vi;
  return en && en.trim() ? en : vi;
}

export function pickList(vi: string[], en: string[] | null | undefined, isEnglish: boolean) {
  if (!isEnglish) return vi;
  return en && en.length ? en : vi;
}
