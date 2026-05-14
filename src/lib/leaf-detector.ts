"use client";

export interface LeafDetectionResult {
  isLeaf: boolean;
  confidence: number;
  greenRatio: number;
  plantLikeRatio: number;
  averageSaturation: number;
  reason: string;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function waitForImageLoad(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể đọc ảnh đầu vào."));
    image.src = src;
  });
}

function rgbToHsv(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;

  return { hue, saturation, value };
}

export async function createPreviewDataUrl(file: File, maxDimension = 1440) {
  const baseDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return baseDataUrl;
  }

  const image = await waitForImageLoad(baseDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return baseDataUrl;

  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.86);
}

export async function detectLeafInImage(src: string): Promise<LeafDetectionResult> {
  const image = await waitForImageLoad(src);
  const scale = Math.min(1, 420 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      isLeaf: false,
      confidence: 0,
      greenRatio: 0,
      plantLikeRatio: 0,
      averageSaturation: 0,
      reason: "Thiết bị hiện tại chưa hỗ trợ kiểm tra ảnh cục bộ.",
    };
  }

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  let visiblePixels = 0;
  let plantLikePixels = 0;
  let greenDominantPixels = 0;
  let exgPositivePixels = 0;
  let saturationSum = 0;

  for (let index = 0; index < data.length; index += 16) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha < 24) continue;

    visiblePixels += 1;
    const { hue, saturation, value } = rgbToHsv(red, green, blue);
    const exg = 2 * green - red - blue;
    const plantHue = hue >= 28 && hue <= 170;
    const plantLike = plantHue && saturation >= 0.12 && value >= 0.16;
    const greenDominant = green >= 42 && green > red * 1.04 && green > blue * 1.02 && exg > 14;

    saturationSum += saturation;

    if (plantLike) plantLikePixels += 1;
    if (greenDominant) greenDominantPixels += 1;
    if (exg > 24) exgPositivePixels += 1;
  }

  if (visiblePixels < 600) {
    return {
      isLeaf: false,
      confidence: 0.16,
      greenRatio: 0,
      plantLikeRatio: 0,
      averageSaturation: 0,
      reason: "Ảnh quá nhỏ hoặc chưa đủ rõ để kiểm tra.",
    };
  }

  const plantLikeRatio = plantLikePixels / visiblePixels;
  const greenRatio = greenDominantPixels / visiblePixels;
  const exgRatio = exgPositivePixels / visiblePixels;
  const averageSaturation = saturationSum / visiblePixels;

  const confidence = clamp(
    plantLikeRatio * 1.45 + greenRatio * 0.85 + exgRatio * 0.55 + averageSaturation * 0.35,
    0,
    0.99,
  );

  const isLeaf =
    confidence >= 0.42 &&
    ((plantLikeRatio >= 0.16 && greenRatio >= 0.08) ||
      plantLikeRatio >= 0.22 ||
      exgRatio >= 0.24);

  let reason = "Ảnh có màu sắc và hình dạng khá giống lá cây, đủ điều kiện để tiếp tục.";

  if (!isLeaf && plantLikeRatio < 0.12) {
    reason = "Ảnh chưa có đủ phần lá cây để hệ thống xác nhận.";
  } else if (!isLeaf && greenRatio < 0.08) {
    reason = "Vùng màu xanh còn quá ít, bạn nên chụp gần hơn vào chiếc lá.";
  } else if (!isLeaf) {
    reason = "Ảnh còn thiếu rõ nét hoặc góc chụp chưa tập trung vào lá.";
  } else if (confidence >= 0.74) {
    reason = "Ảnh khá rõ và phù hợp để lưu lại cho các bước tiếp theo.";
  }

  return {
    isLeaf,
    confidence,
    greenRatio,
    plantLikeRatio,
    averageSaturation,
    reason,
  };
}
