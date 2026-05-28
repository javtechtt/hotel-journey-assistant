// GA Realtime API helper. Mints an ephemeral client secret server-side via
// POST /v1/realtime/client_secrets. The browser then uses that short-lived
// value to negotiate a WebRTC call — the real OPENAI_API_KEY never leaves
// the server.

type Result =
  | { ok: true; value: string }
  | { ok: false; status: number; message: string };

export async function createRealtimeClientSecret(opts: {
  apiKey: string;
  model: string;
  instructions: string;
  tools: unknown[];
  voice: string;
  speed?: number;
}): Promise<Result> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: opts.model,
          instructions: opts.instructions,
          tools: opts.tools,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: { type: "server_vad", create_response: true }
            },
            output: { voice: opts.voice, speed: opts.speed ?? 1.0 }
          }
        }
      })
    });
  } catch (err) {
    return { ok: false, status: 502, message: `Network error reaching OpenAI: ${String(err)}` };
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok) {
    const message = body?.error?.message || body?.error || `OpenAI returned ${res.status}`;
    return { ok: false, status: res.status, message };
  }

  // GA returns the ephemeral key at top-level `value`; tolerate the older
  // `client_secret.value` shape just in case.
  const value = body?.value || body?.client_secret?.value;
  if (!value) {
    return { ok: false, status: 502, message: "OpenAI did not return a client secret." };
  }
  return { ok: true, value };
}
