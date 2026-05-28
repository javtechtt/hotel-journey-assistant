import { NextResponse } from "next/server";
import {
  CUSTOMER_HANDLERS,
  ADMIN_HANDLERS,
  type CustomerToolName,
  type AdminToolName
} from "@/lib/tool-handlers";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: {
    agent?: "customer" | "admin";
    tool?: string;
    args?: Record<string, unknown>;
    session_id?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const agent = payload.agent ?? "customer";
  const tool = payload.tool;
  const args = (payload.args ?? {}) as Record<string, unknown>;
  const ctx = { sessionId: payload.session_id };

  if (!tool) {
    return NextResponse.json({ ok: false, error: "Missing tool name." }, { status: 400 });
  }

  if (agent === "admin") {
    if (!isAdminAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "Admin PIN required." },
        { status: 401 }
      );
    }
    const handlers = ADMIN_HANDLERS as Record<string, (a: any, c: any) => Promise<any>>;
    if (!(tool in handlers)) {
      return NextResponse.json(
        { ok: false, error: `Unknown admin tool '${tool}'.` },
        { status: 400 }
      );
    }
    return runTool(tool, () => handlers[tool as AdminToolName](args as any, ctx));
  }

  const handlers = CUSTOMER_HANDLERS as Record<string, (a: any, c: any) => Promise<any>>;
  if (!(tool in handlers)) {
    return NextResponse.json(
      { ok: false, error: `Unknown customer tool '${tool}'.` },
      { status: 400 }
    );
  }
  return runTool(tool, () => handlers[tool as CustomerToolName](args as any, ctx));
}

// Never let a handler throw an unhandled 500 — surface a clean error to the
// model and log the real cause (e.g. a DB connection failure) for the server logs.
async function runTool(tool: string, fn: () => Promise<any>) {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    console.error(`[agent-tool] '${tool}' failed:`, err);
    return NextResponse.json(
      { ok: false, error: "That request couldn't be completed right now." },
      { status: 200 }
    );
  }
}
