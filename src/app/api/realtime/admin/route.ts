import { NextResponse } from "next/server";
import { ADMIN_TOOLS } from "@/lib/agent-tools";
import { ADMIN_AGENT_INSTRUCTIONS } from "@/lib/agent-prompts";
import { createRealtimeClientSecret } from "@/lib/realtime-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-replace")) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not set. Add a real key to .env.local and restart the dev server."
      },
      { status: 500 }
    );
  }

  const adminPin = process.env.ADMIN_PIN;
  if (adminPin) {
    const provided = req.headers.get("x-admin-pin");
    if (provided !== adminPin) {
      return NextResponse.json({ error: "Admin PIN required." }, { status: 401 });
    }
  }

  const result = await createRealtimeClientSecret({
    apiKey,
    model: REALTIME_MODEL,
    instructions: ADMIN_AGENT_INSTRUCTIONS,
    tools: ADMIN_TOOLS,
    voice: "verse"
  });

  if (!result.ok) {
    console.error("[realtime/admin] OpenAI session error", result.status, result.message);
    return NextResponse.json(
      {
        error: "Failed to create Realtime session.",
        status: result.status,
        model: REALTIME_MODEL,
        openai_message: result.message
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ client_secret: result.value, model: REALTIME_MODEL });
}
