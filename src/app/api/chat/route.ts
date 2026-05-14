import { NextResponse } from "next/server";

import { buildChatApiResponse } from "@/lib/chat-assistant";
import { ChatApiRequest, ChatMode, DiagnosisRecord } from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildSystemPrompt(mode: ChatMode) {
  if (mode === "expert") {
    return [
      "Ban la chuyen gia nong nghiep cua Agromind AI.",
      "Tra loi bang tieng Viet, thuc te, ngan gon, de ap dung ngoai ruong vuon.",
      "Khong khang dinh chan doan benh cuoi cung neu chua co du lieu phan loai ro rang.",
      "Uu tien huong dan quan sat, ghi chu, chup bo sung va buoc xu ly an toan.",
    ].join(" ");
  }

  return [
    "Ban la tro ly AI cua Agromind AI cho nguoi trong cay.",
    "Tra loi bang tieng Viet, than thien nhung khong lan man.",
    "Ho tro hoi dap, tom tat tinh huong, huong dan chup anh la va goi y buoc tiep theo.",
    "Khong bia ket qua CNN/YOLO hoac ket luan benh neu du lieu chua co.",
  ].join(" ");
}

function buildDiagnosisContext(latestDiagnosis?: DiagnosisRecord | null) {
  if (!latestDiagnosis) return "Chua co ca chan doan gan nhat trong phien.";

  return [
    `Cay: ${latestDiagnosis.plant}`,
    `Ket qua hien tai: ${latestDiagnosis.disease}`,
    `Do tin cay: ${Math.round(latestDiagnosis.confidence * 100)}%`,
    `YOLO xac thuc la: ${latestDiagnosis.yoloVerified ? "co" : "chua ro"}`,
    `Ghi chu: ${latestDiagnosis.note}`,
    `Trieu chung: ${latestDiagnosis.symptomSummary}`,
  ].join("\n");
}

function buildGeminiPrompt({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}) {
  return [
    buildSystemPrompt(mode),
    "",
    "Boi canh tu ung dung:",
    buildDiagnosisContext(latestDiagnosis),
    "",
    "Cau hoi nguoi dung:",
    query,
  ].join("\n");
}

async function callGemini({
  query,
  mode,
  latestDiagnosis,
}: {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}) {
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
            parts: [
              {
                text: buildGeminiPrompt({ query, mode, latestDiagnosis }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: mode === "expert" ? 0.35 : 0.55,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n\n")
      .trim();

    return answer || null;
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
    return NextResponse.json({ error: "Body JSON khong hop le." }, { status: 400 });
  }

  const query = body.query?.trim();
  const mode: ChatMode = body.mode === "expert" ? "expert" : "assistant";

  if (!query) {
    return NextResponse.json({ error: "Vui long gui truong query." }, { status: 400 });
  }

  const latestDiagnosis = body.latestDiagnosis ?? null;
  const geminiAnswer = await callGemini({ query, mode, latestDiagnosis });

  if (geminiAnswer) {
    return NextResponse.json({
      mode,
      answer: geminiAnswer,
      generatedAt: new Date().toISOString(),
    });
  }

  const response = buildChatApiResponse({
    query,
    mode,
    latestDiagnosis,
  });

  return NextResponse.json(response);
}
