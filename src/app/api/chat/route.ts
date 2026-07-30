import { NextResponse } from "next/server";

import { resolveDjangoBaseUrl } from "@/lib/backend-url";
import { buildChatApiResponse } from "@/lib/chat-assistant";
import { ChatApiRequest, ChatMode, DiagnosisRecord } from "@/types";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DJANGO_BASE_URL = resolveDjangoBaseUrl(process.env.DJANGO_BASE_URL);

/**
 * `ChatConversation.mode` in Django. The UI calls the diagnosis workspace
 * "assistant"; the stored conversation has always called it "advisor".
 */
const CONVERSATION_MODE: Record<ChatMode, string> = { assistant: "advisor", expert: "expert" };

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

function extractDeepSeekContent(content: unknown) {
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

async function callDeepSeek({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}) {
  if (!DEEPSEEK_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        thinking: { type: "disabled" },
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
      choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
    };

    const choice = data.choices?.[0];
    return (
      extractDeepSeekContent(choice?.message?.content) ||
      extractDeepSeekContent(choice?.message?.reasoning_content) ||
      null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ----------------------------------------------------------- plan caps --- */

/**
 * Every question is recorded in Django before it is answered.
 *
 * The daily chat cap ("Chat theo kết quả": 3/ngày, 20/ngày, vô hạn) and the
 * advanced-advice gate ("Tư vấn nông nghiệp nâng cao") are both enforced by
 * `engagement.views.ChatMessageListCreateAPIView`, which resolves them from the
 * plan catalogue. This route is the only chat path the app actually uses, so
 * answering without writing the question there left both of them decorative —
 * the locked workspace was a React condition and nothing else, and the quota
 * chip counted down from a cap that was never spent.
 *
 * Nothing about a cap is restated here: the refusal, its Vietnamese wording and
 * the plan it points at are Django's, passed through untouched.
 */

type ChargeResult =
  | { ok: true; conversationId: number }
  | { ok: false; status: number; body: Record<string, unknown>; conversationId: number | null };

const AUTH_REQUIRED = { error: "Bạn cần đăng nhập để dùng tính năng này." };

const CHAT_UNAVAILABLE = {
  error: "Chưa ghi nhận được câu hỏi vào lịch sử trò chuyện nên tạm thời chưa thể trả lời. Vui lòng thử lại sau ít phút.",
};

function djangoFetch(path: string, authorization: string, init?: RequestInit) {
  const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
  return fetch(new URL(path, base), {
    ...init,
    headers: { "content-type": "application/json", authorization },
    cache: "no-store",
  });
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data = await response.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function refuse(status: number, body: Record<string, unknown> | null, conversationId: number | null): ChargeResult {
  // 401 (phiên hết hạn) and 402 (hết hạn mức / gói chưa có tính năng) are the
  // backend's own answers and already tell the user what to do. Anything else
  // is an outage, and it fails closed: answering anyway would make the cap
  // depend on Django staying up, which is the same as having no cap. This route
  // already needed Django to validate the token, so nothing new can break.
  if (status === 401) return { ok: false, status, body: body ?? AUTH_REQUIRED, conversationId };
  if (status === 402 || status === 403) return { ok: false, status, body: body ?? CHAT_UNAVAILABLE, conversationId };
  return { ok: false, status: 503, body: CHAT_UNAVAILABLE, conversationId };
}

/**
 * Record the question so it is charged where the cap lives, and hand back the
 * conversation it went into.
 *
 * `requestedConversationId` is a hint from the client, reused only when Django
 * confirms the caller owns it *and* that it belongs to the workspace being
 * asked about. Without the mode check a Seed account could point an "expert"
 * request at its own advisor conversation and read the advanced-advice prompt
 * for free.
 */
async function chargeQuestion(
  authorization: string,
  mode: ChatMode,
  query: string,
  requestedConversationId: number | null,
): Promise<ChargeResult> {
  const wantedMode = CONVERSATION_MODE[mode];
  let conversationId: number | null = null;

  if (requestedConversationId !== null) {
    const res = await djangoFetch(`api/engagement/conversations/${requestedConversationId}/`, authorization);
    if (res.status === 401) return refuse(401, await readJson(res), null);
    if (res.ok) {
      const existing = await readJson(res);
      if (existing?.mode === wantedMode) conversationId = requestedConversationId;
    }
    // Any other answer just means the id is not usable (not this account's, or
    // removed). Open a fresh conversation instead of failing a question the
    // plan allows.
  }

  if (conversationId === null) {
    const res = await djangoFetch("api/engagement/conversations/", authorization, {
      method: "POST",
      // `title` is only a label; the conversation carries the workspace, and
      // creating an expert one is where the feature gate answers 402.
      body: JSON.stringify({ mode: wantedMode, title: query.slice(0, 180) }),
    });
    const created = await readJson(res);
    if (!res.ok) return refuse(res.status, created, null);
    if (typeof created?.id !== "number") return refuse(502, null, null);
    conversationId = created.id;
  }

  const res = await djangoFetch("api/engagement/messages/", authorization, {
    method: "POST",
    body: JSON.stringify({ conversation: conversationId, role: "user", content: query }),
  });
  if (!res.ok) return refuse(res.status, await readJson(res), conversationId);
  return { ok: true, conversationId };
}

function readConversationId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: Request) {
  // The Django calls below authenticate the caller themselves, so the token is
  // still validated against the backend before any paid provider is touched.
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json(AUTH_REQUIRED, { status: 401 });
  }

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

  // Charged before the answer is generated, so a question the plan does not
  // allow never reaches DeepSeek and never looks like it was answered.
  const charged = await chargeQuestion(authorization, mode, query, readConversationId(body.conversationId));
  if (!charged.ok) {
    return NextResponse.json(
      { ...charged.body, conversationId: charged.conversationId },
      { status: charged.status },
    );
  }

  const selectedDiagnosis = body.selectedDiagnosis ?? body.latestDiagnosis ?? null;
  const diagnosisForPrompt = mode === "assistant" ? selectedDiagnosis : null;
  const deepSeekAnswer = await callDeepSeek({ query, mode, latestDiagnosis: diagnosisForPrompt });

  if (deepSeekAnswer) {
    return NextResponse.json({
      mode,
      answer: deepSeekAnswer,
      generatedAt: new Date().toISOString(),
      conversationId: charged.conversationId,
    });
  }

  const response = buildChatApiResponse({
    query,
    mode,
    latestDiagnosis: diagnosisForPrompt,
  });

  return NextResponse.json({ ...response, conversationId: charged.conversationId });
}
