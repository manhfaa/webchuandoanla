import { NextResponse } from "next/server";

type Prediction = {
  class_name?: string;
  plant_name?: string;
  disease_name?: string;
  plant_name_en?: string;
  disease_name_en?: string;
  confidence?: number;
};

type ResearchRequest = {
  symptoms?: string;
  selectedPrediction?: Prediction | null;
  topPredictions?: Prediction[];
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string;
  results?: TavilyResult[];
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = "https://api.tavily.com/search";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function describePrediction(prediction?: Prediction | null) {
  if (!prediction) return "Không rõ";
  return [
    prediction.plant_name || prediction.plant_name_en || "Cây chưa rõ",
    prediction.disease_name || prediction.disease_name_en || prediction.class_name || "bệnh chưa rõ",
    prediction.confidence != null ? `độ tin cậy ${Math.round(prediction.confidence * 100)}%` : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildFallbackCompatibilityQuery(symptoms: string, prediction?: Prediction | null) {
  const plant = prediction?.plant_name_en || prediction?.plant_name || "plant";
  const disease = prediction?.disease_name_en || prediction?.disease_name || prediction?.class_name || "leaf disease";
  return `${plant} ${disease} leaf symptoms ${symptoms} extension`;
}

function buildFallbackTreatmentQuery(prediction?: Prediction | null) {
  const plant = prediction?.plant_name_en || prediction?.plant_name || "plant";
  const disease = prediction?.disease_name_en || prediction?.disease_name || prediction?.class_name || "leaf disease";
  return `${plant} ${disease} leaf disease management treatment extension`;
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function callGeminiText(prompt: string, maxOutputTokens = 700) {
  if (!GEMINI_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          maxOutputTokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim() || null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callTavily(query: string) {
  if (!TAVILY_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as TavilySearchResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function formatSources(results?: TavilyResult[]) {
  return (results ?? [])
    .filter((result) => result.url)
    .slice(0, 5)
    .map((result, index) => ({
      id: index + 1,
      title: cleanText(result.title) || `Nguồn ${index + 1}`,
      url: cleanText(result.url),
      snippet: cleanText(result.content).slice(0, 360),
    }));
}

async function buildCompatibilityQuery(symptoms: string, selectedPrediction?: Prediction | null) {
  const prompt = [
    "Bạn là trợ lý tìm kiếm nông nghiệp.",
    "Hãy viết đúng 1 câu truy vấn tìm kiếm web bằng tiếng Anh để kiểm chứng triệu chứng lá cây có phù hợp với bệnh cây dự đoán hay không.",
    "Không giải thích, chỉ trả về câu search.",
    "",
    `Cây/bệnh CNN chọn: ${describePrediction(selectedPrediction)}`,
    `Triệu chứng người dùng nhập: ${symptoms}`,
  ].join("\n");

  const generated = await callGeminiText(prompt, 80);
  return generated?.replace(/^["']|["']$/g, "").trim() || buildFallbackCompatibilityQuery(symptoms, selectedPrediction);
}

async function assessCompatibility({
  symptoms,
  selectedPrediction,
  topPredictions,
  search,
}: {
  symptoms: string;
  selectedPrediction?: Prediction | null;
  topPredictions: Prediction[];
  search: TavilySearchResponse | null;
}) {
  const sources = formatSources(search?.results);
  const prompt = [
    "Bạn là chuyên gia nông nghiệp hỗ trợ kiểm chứng kết quả CNN bằng nguồn web.",
    "Dựa trên triệu chứng người dùng, bệnh CNN đã chọn, top 5 CNN và kết quả Tavily, hãy đánh giá triệu chứng có phù hợp với bệnh/cây trong top 5 không.",
    "Trả về JSON hợp lệ, không markdown, theo schema:",
    '{"is_consistent":true,"best_match":"...","summary":"2-3 câu tiếng Việt có nhắc nguồn [1], [2] nếu phù hợp","confidence_note":"..."}',
    "",
    `Triệu chứng: ${symptoms}`,
    `Kết quả CNN đã chọn: ${describePrediction(selectedPrediction)}`,
    "Top 5 CNN:",
    ...topPredictions.map((item, index) => `${index + 1}. ${describePrediction(item)}`),
    "",
    "Nguồn Tavily:",
    ...sources.map((source) => `[${source.id}] ${source.title} - ${source.url}\n${source.snippet}`),
  ].join("\n");

  const generated = await callGeminiText(prompt, 600);
  const parsed = generated ? extractJsonObject(generated) : null;
  return {
    isConsistent: typeof parsed?.is_consistent === "boolean" ? parsed.is_consistent : Boolean(sources.length),
    bestMatch: cleanText(parsed?.best_match || describePrediction(selectedPrediction)),
    summary:
      cleanText(parsed?.summary) ||
      "Đã tìm nguồn tham khảo bên ngoài để đối chiếu triệu chứng, nhưng chưa đủ dữ liệu để tổng hợp chắc chắn.",
    confidenceNote:
      cleanText(parsed?.confidence_note) ||
      "Kết quả này chỉ tăng độ tin cậy tham khảo, không thay thế kiểm tra thực địa.",
    sources,
  };
}

async function buildTreatmentSearch(selectedPrediction?: Prediction | null) {
  const prompt = [
    "Viết đúng 1 câu truy vấn web bằng tiếng Anh để tìm phương pháp xử lý/quản lý bệnh lá cây từ nguồn nông nghiệp uy tín.",
    "Không giải thích, chỉ trả về câu search.",
    `Cây/bệnh: ${describePrediction(selectedPrediction)}`,
  ].join("\n");
  const generated = await callGeminiText(prompt, 80);
  return generated?.replace(/^["']|["']$/g, "").trim() || buildFallbackTreatmentQuery(selectedPrediction);
}

async function summarizeTreatment({
  selectedPrediction,
  treatmentSearch,
}: {
  selectedPrediction?: Prediction | null;
  treatmentSearch: TavilySearchResponse | null;
}) {
  const sources = formatSources(treatmentSearch?.results);
  const prompt = [
    "Bạn là chuyên gia nông nghiệp. Tóm tắt ngắn gọn phương pháp xử lý bệnh lá cây dựa trên nguồn Tavily.",
    "Trả về JSON hợp lệ, không markdown, theo schema:",
    '{"summary":"3-4 gạch ý ngắn bằng tiếng Việt, có trích nguồn [1], [2]","safety_note":"1 câu lưu ý an toàn"}',
    "",
    `Cây/bệnh: ${describePrediction(selectedPrediction)}`,
    "Nguồn Tavily:",
    ...sources.map((source) => `[${source.id}] ${source.title} - ${source.url}\n${source.snippet}`),
  ].join("\n");
  const generated = await callGeminiText(prompt, 650);
  const parsed = generated ? extractJsonObject(generated) : null;
  return {
    summary:
      cleanText(parsed?.summary) ||
      "Ưu tiên loại bỏ lá bệnh nặng, giảm ẩm trên lá, cải thiện thông thoáng và hỏi kỹ thuật viên địa phương trước khi dùng thuốc.",
    safetyNote:
      cleanText(parsed?.safety_note) ||
      "Luôn đọc nhãn thuốc, dùng bảo hộ và không lạm dụng thuốc khi chưa xác định rõ nguyên nhân.",
    sources,
  };
}

export async function POST(request: Request) {
  let body: ResearchRequest;
  try {
    body = (await request.json()) as ResearchRequest;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const symptoms = cleanText(body.symptoms);
  if (!symptoms) {
    return NextResponse.json({ skipped: true, reason: "Không có triệu chứng để kiểm chứng." });
  }

  const selectedPrediction = body.selectedPrediction ?? body.topPredictions?.[0] ?? null;
  const topPredictions = (body.topPredictions ?? []).slice(0, 5);

  const compatibilityQuery = await buildCompatibilityQuery(symptoms, selectedPrediction);
  const compatibilitySearch = await callTavily(compatibilityQuery);
  const compatibility = await assessCompatibility({
    symptoms,
    selectedPrediction,
    topPredictions,
    search: compatibilitySearch,
  });

  let treatmentQuery: string | null = null;
  let treatment: Awaited<ReturnType<typeof summarizeTreatment>> | null = null;

  if (compatibility.isConsistent) {
    treatmentQuery = await buildTreatmentSearch(selectedPrediction);
    const treatmentSearch = await callTavily(treatmentQuery);
    treatment = await summarizeTreatment({ selectedPrediction, treatmentSearch });
  }

  return NextResponse.json({
    skipped: false,
    available: Boolean(TAVILY_API_KEY),
    compatibilityQuery,
    isSymptomConsistent: compatibility.isConsistent,
    bestMatch: compatibility.bestMatch,
    compatibilitySummary: compatibility.summary,
    confidenceNote: compatibility.confidenceNote,
    compatibilitySources: compatibility.sources,
    treatmentQuery,
    treatmentSummary: treatment?.summary ?? null,
    treatmentSafetyNote: treatment?.safetyNote ?? null,
    treatmentSources: treatment?.sources ?? [],
    generatedAt: new Date().toISOString(),
  });
}
