import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

type Dict = Record<string, string>;

const dictionaries: Record<"vi" | "en", Dict> = { vi, en };

export function t(language: "vi" | "en", key: string) {
  return dictionaries[language][key] ?? dictionaries.vi[key] ?? key;
}
