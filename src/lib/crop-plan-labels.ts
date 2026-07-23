const phaseLabels: Record<string, string> = {
  preparation: "Chuẩn bị",
  sowing: "Gieo trồng",
  early_care: "Chăm cây con",
  maintenance: "Chăm sóc định kỳ",
  monitoring: "Theo dõi cây",
  harvest: "Thu hoạch",
};

const suitabilityLabels: Record<string, string> = {
  excellent: "Rất phù hợp",
  good: "Phù hợp",
  suitable: "Phù hợp",
  borderline: "Cần cân nhắc",
  poor: "Ít phù hợp",
  unsuitable: "Không phù hợp",
};

export function getCropPhaseLabel(value: string) {
  return phaseLabels[value] ?? value.replaceAll("_", " ");
}

export function getSuitabilityLabel(value: string) {
  return suitabilityLabels[value.toLowerCase()] ?? value;
}
