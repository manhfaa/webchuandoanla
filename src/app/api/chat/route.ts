import { NextResponse } from "next/server";

import { buildChatApiResponse } from "@/lib/chat-assistant";
import { ChatApiRequest, ChatMode, DiagnosisRecord } from "@/types";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "nvidia/llama-nemotron-rerank-vl-1b-v2:free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildSystemPrompt(mode: ChatMode) {
  if (mode === "expert") {
    return [
      "Bạn là chuyên gia nông nghiệp của Agromind AI.",
      "Trả lời bằng tiếng Việt, thực tế, có thể áp dụng cho người trồng cây ở Việt Nam.",
      "Không dựa vào CNN, YOLO hoặc lịch sử chẩn đoán của ứng dụng trong chế độ này.",
      "Tư vấn các vấn đề nông nghiệp tổng quát: đất, nước, phân bón, thời tiết, sâu bệnh, lịch chăm sóc, canh tác an toàn.",
      "Nếu thiếu thông tin, hãy hỏi thêm cây trồng, vị trí, mùa vụ, điều kiện tưới, đất và triệu chứng thực địa.",
      "Không tự nhận là bác sĩ thú y/thực vật học đang kiểm tra trực tiếp; chỉ đưa khuyến nghị tham khảo an toàn.",
    ].join(" ");
  }

  return [
    "Bạn là trợ lý AI của Agromind AI cho người trồng cây.",
    "Trả lời bằng tiếng Việt, thân thiện nhưng không lan man.",
    "Chỉ dùng ca chẩn đoán được người dùng chọn trong lịch sử nếu bối cảnh đó được gửi kèm.",
    "Hỗ trợ hỏi đáp về kết quả CNN, triệu chứng, top bệnh khả nghi, khuyến nghị hành động và bước theo dõi tiếp theo.",
    "Không bịa kết quả CNN/YOLO hoặc kết luận bệnh ngoài dữ liệu chẩn đoán được cung cấp.",
  ].join(" ");
}

function buildDiagnosisContext(latestDiagnosis?: DiagnosisRecord | null) {
  if (!latestDiagnosis) return "Chưa có ca chẩn đoán gần nhất trong phiên.";

  return [
    `Cây: ${latestDiagnosis.plant}`,
    `Kết quả hiện tại: ${latestDiagnosis.disease}`,
    `Độ tin cậy: ${Math.round(latestDiagnosis.confidence * 100)}%`,
    `YOLO xác thực lá: ${latestDiagnosis.yoloVerified ? "có" : "chưa rõ"}`,
    `Ghi chú: ${latestDiagnosis.note}`,
    `Triệu chứng: ${latestDiagnosis.symptomSummary}`,
  ].join("\n");
}

function buildUserPrompt({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}) {
  return [
    mode === "assistant" ? "Bối cảnh ca chẩn đoán được chọn:" : "Bối cảnh:",
    mode === "assistant"
      ? buildDiagnosisContext(latestDiagnosis)
      : "Chế độ chuyên gia nông nghiệp độc lập, không dùng dữ liệu CNN/YOLO/lịch sử chẩn đoán.",
    "",
    "Câu hỏi người dùng:",
    query,
  ].join("\n");
}

function extractOpenRouterContent(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }
  return "";
}

async function callOpenRouter({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}) {
  if (!OPENROUTER_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://agromindai.vercel.app",
        "X-OpenRouter-Title": "Agromind AI",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(mode) },
          { role: "user", content: buildUserPrompt({ query, mode, latestDiagnosis }) },
        ],
        temperature: mode === "expert" ? 0.35 : 0.55,
        top_p: 0.9,
        max_tokens: 700,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    return extractOpenRouterContent(data.choices?.[0]?.message?.content) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: Partial<ChatApiRequest> = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const query = body.query?.trim();
  const mode: ChatMode = body.mode === "expert" ? "expert" : "assistant";

  if (!query) {
    return NextResponse.json({ error: "Vui lòng gửi trường query." }, { status: 400 });
  }

  const selectedDiagnosis = body.selectedDiagnosis ?? body.latestDiagnosis ?? null;
  const diagnosisForPrompt = mode === "assistant" ? selectedDiagnosis : null;
  const openRouterAnswer = await callOpenRouter({ query, mode, latestDiagnosis: diagnosisForPrompt });

  if (openRouterAnswer) {
    return NextResponse.json({
      mode,
      answer: openRouterAnswer,
      generatedAt: new Date().toISOString(),
    });
  }

  const response = buildChatApiResponse({
    query,
    mode,
    latestDiagnosis: diagnosisForPrompt,
  });

  return NextResponse.json(response);
}
