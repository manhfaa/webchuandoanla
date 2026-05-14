import { NextResponse } from "next/server";

import { buildChatApiResponse } from "@/lib/chat-assistant";
import { ChatApiRequest, ChatMode } from "@/types";

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

  const response = buildChatApiResponse({
    query,
    mode,
    latestDiagnosis: body.latestDiagnosis ?? null,
  });

  return NextResponse.json(response);
}
