import { NextResponse } from "next/server";
import { CUSTOMER_TOOLS } from "@/lib/agent-tools";
import { CUSTOMER_AGENT_INSTRUCTIONS, currentDateContext } from "@/lib/agent-prompts";
import { createRealtimeClientSecret } from "@/lib/realtime-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";

export async function POST() {
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

  const result = await createRealtimeClientSecret({
    apiKey,
    model: REALTIME_MODEL,
    instructions: CUSTOMER_AGENT_INSTRUCTIONS + currentDateContext(),
    tools: CUSTOMER_TOOLS,
    voice: process.env.OPENAI_REALTIME_VOICE || "sage",
    speed: Number(process.env.OPENAI_REALTIME_SPEED) || 1.1
  });

  if (!result.ok) {
    console.error("[realtime/customer] OpenAI session error", result.status, result.message);
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
