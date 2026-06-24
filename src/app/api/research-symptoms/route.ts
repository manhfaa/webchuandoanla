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
  raw_content?: string;
  score?: number;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string;
  results?: TavilyResult[];
};

type ResearchSource = {
  id: number;
  title: string;
  url: string;
  snippet: string;
  rawContent: string;
};

type SearchPromptResult = {
  displayQuestion: string;
  tavilyQuery: string;
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

function extractJsonObject(text: string) {
  const normalized = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const firstParse = JSON.parse(normalized.slice(start, end + 1)) as unknown;
    if (typeof firstParse === "string") {
      return extractJsonObject(firstParse);
    }
    return firstParse as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeGeminiJsonText(value: unknown) {
  const text = cleanText(value);
  const parsed = extractJsonObject(text);
  if (parsed) return parsed;
  return null;
}

function pickStringField(source: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(source?.[key]);
    if (value) return value;
  }
  return "";
}

function collectStringFields(value: unknown, path: string[] = []): Array<{ key: string; value: string }> {
  if (typeof value === "string") {
    const text = cleanText(value);
    return text ? [{ key: path.join("."), value: text }] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStringFields(item, [...path, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => collectStringFields(item, [...path, key]));
  }

  return [];
}

function looksLikeVietnameseQuestion(value: string) {
  return /[?？]$/.test(value) || /liệu|có phù hợp|nên được xử lý|như thế nào/i.test(value);
}

function looksLikeSearchQuery(value: string) {
  return (
    !looksLikeVietnameseQuestion(value) &&
    /disease|symptom|leaf|plant|pepper|apple|corn|raspberry|bacterial|spot|rust|treatment|management|control|extension|university|agriculture/i.test(
      value,
    )
  );
}

function tryParseSearchPromptResult(generated: string): SearchPromptResult | null {
  const parsed = normalizeGeminiJsonText(generated);
  let displayQuestion = pickStringField(parsed, [
    "display_question",
    "displayQuestion",
    "question",
    "user_question",
    "userQuestion",
    "search_question",
    "searchQuestion",
    "verification_question",
    "verificationQuestion",
    "treatment_question",
    "treatmentQuestion",
    "compatibility_question",
    "compatibilityQuestion",
  ]);
  let tavilyQuery = pickStringField(parsed, [
    "tavily_query",
    "tavilyQuery",
    "tavily_search_query",
    "tavilySearchQuery",
    "query",
    "search_query",
    "searchQuery",
    "search",
    "search_term",
    "searchTerm",
    "web_query",
    "webQuery",
  ]);

  const fields = collectStringFields(parsed);
  if (!displayQuestion) {
    displayQuestion = fields.find((field) => looksLikeVietnameseQuestion(field.value))?.value ?? "";
  }
  if (!tavilyQuery) {
    tavilyQuery = fields.find((field) => field.value !== displayQuestion && looksLikeSearchQuery(field.value))?.value ?? "";
  }
  if ((!displayQuestion || !tavilyQuery) && fields.length >= 2) {
    displayQuestion ||= fields[0]?.value ?? "";
    tavilyQuery ||= fields.find((field) => field.value !== displayQuestion)?.value ?? "";
  }

  if (!displayQuestion || !tavilyQuery) return null;
  return { displayQuestion, tavilyQuery };
}

function parseSearchPromptResult(generated: string, step: string): SearchPromptResult {
  const parsed = tryParseSearchPromptResult(generated);
  if (parsed) return parsed;

  throw new Error(`Gemini chưa trả đúng câu hỏi hiển thị và query Tavily cho bước ${step}.`);
}

async function repairSearchPromptResult({
  generated,
  originalPrompt,
  step,
}: {
  generated: string;
  originalPrompt: string;
  step: string;
}) {
  const prompt = [
    "Bạn đang sửa output JSON cho Agromind AI.",
    "Output trước đó của Gemini chưa đúng schema hoặc thiếu key.",
    "BẮT BUỘC dùng chính ngữ cảnh yêu cầu ban đầu và output trước đó để viết lại đúng 2 trường.",
    "Không markdown, không giải thích, không bọc ```json.",
    "Chỉ trả về JSON object hợp lệ với đúng 2 key: display_question và tavily_query.",
    '{"display_question":"...","tavily_query":"..."}',
    "",
    "Yêu cầu ban đầu:",
    originalPrompt,
    "",
    "Output trước đó:",
    generated,
  ].join("\n");

  const repaired = await requireGeminiText(prompt, 260, `sửa JSON câu search ${step}`);
  return parseSearchPromptResult(repaired, step);
}

async function callGeminiText(prompt: string, maxOutputTokens = 700) {
  if (!GEMINI_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

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
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Gemini API lỗi ${response.status}`;
      try {
        const errorBody = (await response.json()) as { error?: { message?: string; status?: string } };
        const detail = cleanText(errorBody.error?.status || errorBody.error?.message);
        if (detail) message += `: ${detail}`;
      } catch {
        // Keep the HTTP status when Gemini does not return a JSON error body.
      }
      throw new Error(message);
    }
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
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function requireGeminiText(prompt: string, maxOutputTokens: number, step: string) {
  const text = await callGeminiText(prompt, maxOutputTokens);
  if (!text) {
    throw new Error(`Gemini không hoàn tất bước: ${step}.`);
  }
  return text;
}

async function callTavily(query: string) {
  if (!TAVILY_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

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
        include_raw_content: true,
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

async function requireTavilySearch(query: string, step: string) {
  const search = await callTavily(query);
  if (!search?.results?.length) {
    throw new Error(`Tavily không trả về nguồn cho bước: ${step}.`);
  }
  return search;
}

function formatSources(results?: TavilyResult[]): ResearchSource[] {
  return (results ?? [])
    .filter((result) => result.url)
    .slice(0, 5)
    .map((result, index) => ({
      id: index + 1,
      title: cleanText(result.title) || `Nguồn ${index + 1}`,
      url: cleanText(result.url),
      snippet: cleanText(result.content).slice(0, 480),
      rawContent: cleanText(result.raw_content || result.content).slice(0, 1800),
    }));
}

async function buildCompatibilitySearch(symptoms: string, topPredictions: Prediction[], selectedPrediction?: Prediction | null): Promise<SearchPromptResult> {
  const prompt = [
    "Bạn là trợ lý tìm kiếm nông nghiệp cho Agromind AI.",
    "BẮT BUỘC: dùng Gemini để viết câu hỏi kiểm chứng và câu query đưa cho Tavily.",
    "display_question phải là tiếng Việt tự nhiên theo mẫu: Liệu bệnh X trên cây Y có phù hợp với triệu chứng Z không?",
    "tavily_query phải là tiếng Anh, đủ cụ thể, có cây, bệnh, triệu chứng và ưu tiên nguồn extension/university/agriculture.",
    "Không giải thích, không markdown, không bọc ```json. Chỉ trả về JSON object hợp lệ theo schema:",
    '{"display_question":"Liệu bệnh ... có phù hợp với triệu chứng ... không?","tavily_query":"..."}',
    "",
    `Kết quả CNN đang chọn: ${describePrediction(selectedPrediction)}`,
    "Top 5 CNN:",
    ...topPredictions.map((item, index) => `${index + 1}. ${describePrediction(item)}`),
    `Triệu chứng người dùng nhập: ${symptoms}`,
  ].join("\n");

  const generated = await requireGeminiText(prompt, 220, "viết câu hỏi và query kiểm chứng triệu chứng");
  return tryParseSearchPromptResult(generated) ?? repairSearchPromptResult({ generated, originalPrompt: prompt, step: "kiểm chứng" });
}

async function summarizeCompatibility({
  symptoms,
  selectedPrediction,
  topPredictions,
  sources,
}: {
  symptoms: string;
  selectedPrediction?: Prediction | null;
  topPredictions: Prediction[];
  sources: ResearchSource[];
}) {
  const prompt = [
    "Bạn là chuyên gia nông nghiệp của Agromind AI.",
    "BẮT BUỘC: đọc tất cả thông tin từ các trang Tavily bên dưới rồi tổng hợp cho người dùng.",
    "Nhiệm vụ: trả lời liệu triệu chứng người dùng nhập có phù hợp với kết quả CNN hoặc một bệnh/cây trong top 5 CNN không.",
    "Nếu phù hợp với bệnh khác trong top 5 hơn kết quả đang chọn, ghi bệnh đó ở best_match.",
    "Tóm tắt bằng tiếng Việt dễ hiểu, có trích nguồn dạng [1], [2]. Không bịa thông tin ngoài nguồn.",
    "Trả về JSON object hợp lệ, không markdown, không bọc ```json, theo schema:",
    '{"is_consistent":true,"best_match":"...","summary":"...","confidence_note":"..."}',
    "",
    `Triệu chứng: ${symptoms}`,
    `Kết quả CNN đang chọn: ${describePrediction(selectedPrediction)}`,
    "Top 5 CNN:",
    ...topPredictions.map((item, index) => `${index + 1}. ${describePrediction(item)}`),
    "",
    "Nguồn Tavily:",
    ...sources.map(
      (source) =>
        `[${source.id}] ${source.title} - ${source.url}\nĐoạn trích: ${source.snippet}\nNội dung trang: ${source.rawContent}`,
    ),
  ].join("\n");

  const generated = await requireGeminiText(prompt, 1200, "đọc nguồn Tavily và tổng hợp độ phù hợp triệu chứng");
  const parsed = extractJsonObject(generated);
  return {
    isConsistent: typeof parsed?.is_consistent === "boolean" ? parsed.is_consistent : false,
    bestMatch: cleanText(parsed?.best_match || describePrediction(selectedPrediction)),
    summary: cleanText(parsed?.summary || generated),
    confidenceNote:
      cleanText(parsed?.confidence_note) ||
      "Đây là kiểm chứng tham khảo bằng nguồn web, không thay thế kiểm tra trực tiếp ngoài vườn.",
    sources,
  };
}

async function buildTreatmentSearch(selectedPrediction?: Prediction | null, bestMatch?: string): Promise<SearchPromptResult> {
  const prompt = [
    "Bạn là trợ lý tìm kiếm nông nghiệp cho Agromind AI.",
    "BẮT BUỘC: dùng Gemini để viết câu hỏi xử lý và câu query đưa cho Tavily.",
    "display_question phải là tiếng Việt tự nhiên theo mẫu: Liệu bệnh X này nên được xử lý ban đầu như thế nào?",
    "tavily_query phải là tiếng Anh, đủ cụ thể, có cây, bệnh, treatment/management/control và ưu tiên nguồn extension/university/agriculture.",
    "Không giải thích, không markdown, không bọc ```json. Chỉ trả về JSON object hợp lệ theo schema:",
    '{"display_question":"Liệu bệnh ... này nên được xử lý ban đầu như thế nào?","tavily_query":"..."}',
    "",
    bestMatch ? `Bệnh/cây phù hợp nhất: ${bestMatch}` : "",
    `Kết quả CNN đang chọn: ${describePrediction(selectedPrediction)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const generated = await requireGeminiText(prompt, 220, "viết câu hỏi và query phương pháp xử lý");
  return tryParseSearchPromptResult(generated) ?? repairSearchPromptResult({ generated, originalPrompt: prompt, step: "xử lý" });
}

async function summarizeTreatment({
  selectedPrediction,
  bestMatch,
  sources,
}: {
  selectedPrediction?: Prediction | null;
  bestMatch?: string;
  sources: ResearchSource[];
}) {
  const prompt = [
    "Bạn là chuyên gia nông nghiệp của Agromind AI.",
    "BẮT BUỘC: đọc tất cả thông tin từ các trang Tavily bên dưới rồi tổng hợp phương pháp xử lý cho người dùng.",
    "Chỉ dùng thông tin có trong nguồn. Không bịa thuốc, liều lượng hoặc khẳng định quá mức nếu nguồn không nêu.",
    "Tóm tắt ngắn gọn bằng tiếng Việt, có trích nguồn dạng [1], [2].",
    "Trả về JSON object hợp lệ, không markdown, không bọc ```json, theo schema:",
    '{"summary":"...","safety_note":"..."}',
    "",
    bestMatch ? `Bệnh/cây phù hợp nhất: ${bestMatch}` : "",
    `Kết quả CNN đang chọn: ${describePrediction(selectedPrediction)}`,
    "Nguồn Tavily:",
    ...sources.map(
      (source) =>
        `[${source.id}] ${source.title} - ${source.url}\nĐoạn trích: ${source.snippet}\nNội dung trang: ${source.rawContent}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const generated = await requireGeminiText(prompt, 1200, "đọc nguồn Tavily và tổng hợp phương pháp xử lý");
  const parsed = extractJsonObject(generated);
  return {
    summary: cleanText(parsed?.summary || generated),
    safetyNote:
      cleanText(parsed?.safety_note) ||
      "Luôn đọc nhãn thuốc, dùng bảo hộ và hỏi kỹ thuật viên địa phương trước khi xử lý nếu bệnh lan rộng.",
    sources,
  };
}

async function buildFinalConclusion({
  symptoms,
  selectedPrediction,
  topPredictions,
  compatibility,
  treatment,
}: {
  symptoms: string;
  selectedPrediction?: Prediction | null;
  topPredictions: Prediction[];
  compatibility: Awaited<ReturnType<typeof summarizeCompatibility>>;
  treatment: Awaited<ReturnType<typeof summarizeTreatment>>;
}) {
  const prompt = [
    "Bạn là Agromind AI.",
    "BẮT BUỘC: chốt cuối cùng bằng Gemini sau khi pipeline đã chạy đủ:",
    "1. Gemini viết câu search kiểm chứng triệu chứng.",
    "2. Tavily search kiểm chứng.",
    "3. Gemini đọc nguồn Tavily và tổng hợp độ phù hợp.",
    "4. Gemini viết câu search phương pháp xử lý.",
    "5. Tavily search phương pháp xử lý.",
    "6. Gemini đọc nguồn Tavily và tổng hợp xử lý.",
    "Bây giờ hãy chốt kết luận cuối cùng cho người dùng bằng tiếng Việt.",
    "Trả về JSON object hợp lệ, không markdown, không bọc ```json, theo schema:",
    '{"final_conclusion":"...","user_next_step":"..."}',
    "",
    `Triệu chứng: ${symptoms}`,
    `Kết quả CNN đang chọn: ${describePrediction(selectedPrediction)}`,
    "Top 5 CNN:",
    ...topPredictions.map((item, index) => `${index + 1}. ${describePrediction(item)}`),
    `Độ phù hợp triệu chứng: ${compatibility.isConsistent ? "phù hợp" : "chưa phù hợp rõ"}`,
    `Best match: ${compatibility.bestMatch}`,
    `Tóm tắt kiểm chứng: ${compatibility.summary}`,
    `Tóm tắt xử lý: ${treatment.summary}`,
    `Lưu ý an toàn: ${treatment.safetyNote}`,
  ].join("\n");

  const generated = await requireGeminiText(prompt, 900, "chốt kết luận cuối cùng");
  const parsed = extractJsonObject(generated);
  return {
    finalConclusion: cleanText(parsed?.final_conclusion || generated),
    userNextStep:
      cleanText(parsed?.user_next_step) ||
      "Theo dõi cây thêm vài ngày và chụp lại nếu triệu chứng lan rộng.",
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

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Thiếu GEMINI_API_KEY để viết câu search và tổng hợp." }, { status: 503 });
  }

  if (!TAVILY_API_KEY) {
    return NextResponse.json({ error: "Thiếu TAVILY_API_KEY để search nguồn web." }, { status: 503 });
  }

  const selectedPrediction = body.selectedPrediction ?? body.topPredictions?.[0] ?? null;
  const topPredictions = (body.topPredictions ?? []).slice(0, 5);

  try {
    const compatibilitySearchPrompt = await buildCompatibilitySearch(symptoms, topPredictions, selectedPrediction);
    const compatibilitySearch = await requireTavilySearch(compatibilitySearchPrompt.tavilyQuery, "kiểm chứng triệu chứng với kết quả CNN");
    const compatibilitySources = formatSources(compatibilitySearch.results);
    const compatibility = await summarizeCompatibility({
      symptoms,
      selectedPrediction,
      topPredictions,
      sources: compatibilitySources,
    });

    const treatmentSearchPrompt = await buildTreatmentSearch(selectedPrediction, compatibility.bestMatch);
    const treatmentSearch = await requireTavilySearch(treatmentSearchPrompt.tavilyQuery, "tìm phương pháp xử lý");
    const treatmentSources = formatSources(treatmentSearch.results);
    const treatment = await summarizeTreatment({
      selectedPrediction,
      bestMatch: compatibility.bestMatch,
      sources: treatmentSources,
    });

    const final = await buildFinalConclusion({
      symptoms,
      selectedPrediction,
      topPredictions,
      compatibility,
      treatment,
    });

    return NextResponse.json({
      skipped: false,
      available: true,
      pipeline: [
        "gemini_build_compatibility_query",
        "tavily_search_compatibility",
        "gemini_summarize_compatibility",
        "gemini_build_treatment_query",
        "tavily_search_treatment",
        "gemini_summarize_treatment",
        "gemini_final_conclusion",
      ],
      compatibilityQuestion: compatibilitySearchPrompt.displayQuestion,
      compatibilityQuery: compatibilitySearchPrompt.tavilyQuery,
      isSymptomConsistent: compatibility.isConsistent,
      bestMatch: compatibility.bestMatch,
      compatibilitySummary: compatibility.summary,
      confidenceNote: compatibility.confidenceNote,
      compatibilitySources: compatibility.sources,
      treatmentQuestion: treatmentSearchPrompt.displayQuestion,
      treatmentQuery: treatmentSearchPrompt.tavilyQuery,
      treatmentSummary: treatment.summary,
      treatmentSafetyNote: treatment.safetyNote,
      treatmentSources: treatment.sources,
      finalConclusion: final.finalConclusion,
      userNextStep: final.userNextStep,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Không hoàn tất được pipeline Gemini + Tavily.",
      },
      { status: 502 },
    );
  }
}
