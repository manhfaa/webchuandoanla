import { NextResponse } from "next/server";

import { resolveDjangoBaseUrl } from "@/lib/backend-url";
import type { ChatApiRequest } from "@/types";

const DJANGO_BASE_URL = resolveDjangoBaseUrl(process.env.DJANGO_BASE_URL);
const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 45_000;

function backendUrl(path: string) {
  const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
  return new URL(path, base);
}

function readPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để dùng tính năng này." }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Câu hỏi quá dài." }, { status: 413 });
  }

  let body: Partial<ChatApiRequest>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Câu hỏi quá dài." }, { status: 413 });
    }
    body = JSON.parse(raw) as Partial<ChatApiRequest>;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const query = body.query?.trim() ?? "";
  if (!query) return NextResponse.json({ error: "Vui lòng gửi trường query." }, { status: 400 });
  if (query.length > 4000) return NextResponse.json({ error: "Câu hỏi quá dài." }, { status: 400 });

  const mode = body.mode === "expert" ? "expert" : "assistant";
  const selected = mode === "assistant" ? body.selectedDiagnosis ?? body.latestDiagnosis : null;
  const diagnosisId = readPositiveInteger(selected?.id);
  const conversationId = readPositiveInteger(body.conversationId);

  let response: Response;
  try {
    response = await fetch(backendUrl("api/engagement/chat/respond/"), {
      method: "POST",
      headers: { "content-type": "application/json", authorization },
      body: JSON.stringify({
        query,
        mode,
        diagnosis_id: diagnosisId,
        conversation_id: conversationId,
        client_request_id: body.clientRequestId ?? crypto.randomUUID(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json(
      { error: "Chưa kết nối được máy chủ tư vấn. Vui lòng thử lại sau ít phút." },
      { status: 502 },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return NextResponse.json(
      { ...payload, conversationId: payload.conversation_id ?? conversationId },
      { status: response.status },
    );
  }

  return NextResponse.json({
    mode: payload.mode ?? mode,
    answer: payload.answer,
    generatedAt: payload.generated_at,
    conversationId: payload.conversation_id,
  });
}
