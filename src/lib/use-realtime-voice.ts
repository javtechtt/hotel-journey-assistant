"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeClient } from "@/lib/realtime-client";
import { AudioMeter } from "@/lib/audio-meter";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type TranscriptTurn = {
  id: string;
  role: "guest" | "assistant";
  text: string;
  partial?: boolean;
};

export type ToolCallEvent = {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type UseRealtimeVoiceOptions = {
  agent: "customer" | "admin";
  adminPin?: string;
  initialGreeting?: string;
  onToolCall: (
    call: ToolCallEvent
  ) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  onToolResult?: (
    call: ToolCallEvent,
    result: { ok: boolean; data?: unknown; error?: string }
  ) => void;
};

export function useRealtimeVoice(opts: UseRealtimeVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const clientRef = useRef<RealtimeClient | null>(null);
  // Live 0..1 loudness (mic + agent), read each frame by the breathing edges.
  const levelRef = useRef(0);
  const meterRef = useRef<AudioMeter | null>(null);
  // Buffers for streaming assistant output and pending function args
  const assistantBufRef = useRef<Map<string, string>>(new Map());
  const guestBufRef = useRef<Map<string, string>>(new Map());
  const pendingCallsRef = useRef<
    Map<string, { name: string; args_buffer: string; call_id: string }>
  >(new Map());
  // Each function call surfaces via BOTH function_call_arguments.done and
  // output_item.done — track handled call_ids so we execute (and respond) once.
  const processedCallsRef = useRef<Set<string>>(new Set());
  // Only one response may be active at a time. Track whether one is in
  // flight, and whether a tool follow-up response is queued behind it.
  const responseActiveRef = useRef(false);
  const followupQueuedRef = useRef(false);
  // True while the guest is speaking (used to detect/handle barge-in).
  const userSpeakingRef = useRef(false);

  // Request a follow-up response after tool output(s). If a response is still
  // streaming, defer until response.done; otherwise fire immediately. A short
  // debounce coalesces parallel tool calls into a single response.create.
  const requestFollowupRef = useRef<() => void>(() => {});
  requestFollowupRef.current = () => {
    if (responseActiveRef.current) {
      followupQueuedRef.current = true;
      return;
    }
    followupQueuedRef.current = false;
    responseActiveRef.current = true;
    clientRef.current?.createResponse();
  };

  const appendTurn = useCallback((turn: TranscriptTurn) => {
    setTranscript((prev) => {
      const idx = prev.findIndex((t) => t.id === turn.id);
      if (idx === -1) return [...prev, turn];
      const copy = [...prev];
      copy[idx] = turn;
      return copy;
    });
  }, []);

  const handleEvent = useCallback(
    async (event: any) => {
      const type = event.type as string | undefined;
      if (!type) return;

      // Streaming guest transcription
      if (type === "conversation.item.input_audio_transcription.delta") {
        const id = event.item_id;
        const prev = guestBufRef.current.get(id) ?? "";
        const next = prev + (event.delta ?? "");
        guestBufRef.current.set(id, next);
        appendTurn({ id, role: "guest", text: next, partial: true });
      } else if (type === "conversation.item.input_audio_transcription.completed") {
        const id = event.item_id;
        const finalText = (event.transcript ?? "").trim();
        guestBufRef.current.delete(id);
        if (finalText) appendTurn({ id, role: "guest", text: finalText, partial: false });
      }

      // Streaming assistant output (GA uses output_audio_transcript.*; beta
      // used audio_transcript.* — handle both for compatibility)
      else if (
        type === "response.output_audio_transcript.delta" ||
        type === "response.audio_transcript.delta"
      ) {
        const id = event.response_id || event.item_id || "assistant";
        const prev = assistantBufRef.current.get(id) ?? "";
        const next = prev + (event.delta ?? "");
        assistantBufRef.current.set(id, next);
        setStatus("speaking");
        appendTurn({ id, role: "assistant", text: next, partial: true });
      } else if (
        type === "response.output_audio_transcript.done" ||
        type === "response.audio_transcript.done"
      ) {
        const id = event.response_id || event.item_id || "assistant";
        const finalText = event.transcript ?? assistantBufRef.current.get(id) ?? "";
        assistantBufRef.current.delete(id);
        if (finalText) appendTurn({ id, role: "assistant", text: finalText, partial: false });
      }

      // Status hints + barge-in tracking
      else if (type === "input_audio_buffer.speech_started") {
        // The guest started talking — this is a barge-in if the agent is mid-reply.
        userSpeakingRef.current = true;
        setStatus("listening");
      } else if (type === "input_audio_buffer.speech_stopped") {
        userSpeakingRef.current = false;
        setStatus("thinking");
      } else if (type === "response.created") {
        responseActiveRef.current = true;
        setStatus("thinking");
      } else if (type === "response.done") {
        responseActiveRef.current = false;
        setStatus("listening");
        if (followupQueuedRef.current) {
          followupQueuedRef.current = false;
          // Don't fire a tool follow-up while the guest is barging in — the
          // tool output is already in the conversation and folds into their
          // next turn, so a competing response can't collide.
          if (!userSpeakingRef.current) {
            responseActiveRef.current = true;
            clientRef.current?.createResponse();
          }
        }
      }

      // Function/tool calls (deltas + done)
      else if (type === "response.function_call_arguments.delta") {
        const id = event.item_id || event.call_id;
        const callId = event.call_id;
        const existing =
          pendingCallsRef.current.get(id) ||
          ({ name: "", args_buffer: "", call_id: callId } as any);
        existing.args_buffer += event.delta ?? "";
        existing.call_id = callId;
        pendingCallsRef.current.set(id, existing);
      } else if (type === "response.output_item.added" && event.item?.type === "function_call") {
        const id = event.item.id;
        pendingCallsRef.current.set(id, {
          name: event.item.name,
          args_buffer: event.item.arguments || "",
          call_id: event.item.call_id
        });
      } else if (
        type === "response.function_call_arguments.done" ||
        (type === "response.output_item.done" && event.item?.type === "function_call")
      ) {
        const item = event.item;
        const id = item?.id || event.item_id;
        const pending = pendingCallsRef.current.get(id);
        const callId =
          item?.call_id || pending?.call_id || event.call_id;
        const name = item?.name || pending?.name;
        const argsRaw =
          item?.arguments || event.arguments || pending?.args_buffer || "{}";
        pendingCallsRef.current.delete(id);
        if (!name || !callId) return;
        // De-dupe: both *.done events fire for one call — handle it once.
        if (processedCallsRef.current.has(callId)) return;
        processedCallsRef.current.add(callId);
        let parsed: Record<string, unknown> = {};
        try {
          parsed = argsRaw ? JSON.parse(argsRaw) : {};
        } catch {
          parsed = {};
        }
        const call: ToolCallEvent = { call_id: callId, name, arguments: parsed };
        try {
          const result = await opts.onToolCall(call);
          opts.onToolResult?.(call, result);
          clientRef.current?.sendFunctionOutput(callId, result);
        } catch (err) {
          const result = { ok: false, error: String(err) };
          opts.onToolResult?.(call, result);
          clientRef.current?.sendFunctionOutput(callId, result);
        }
        // Ask for the spoken follow-up — deferred if a response is still live.
        requestFollowupRef.current();
      } else if (type === "error") {
        setError(event.error?.message ?? "Realtime error");
        setStatus("error");
      }
    },
    [appendTurn, opts]
  );

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    responseActiveRef.current = false;
    followupQueuedRef.current = false;
    userSpeakingRef.current = false;
    processedCallsRef.current.clear();
    meterRef.current?.stop();
    meterRef.current = new AudioMeter((l) => {
      levelRef.current = l;
    });
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (opts.agent === "admin" && opts.adminPin) {
        headers["x-admin-pin"] = opts.adminPin;
      }
      const res = await fetch(
        opts.agent === "admin" ? "/api/realtime/admin" : "/api/realtime/customer",
        { method: "POST", headers }
      );
      const body = await res.json();
      if (!res.ok) {
        const detail = body?.openai_message ? ` — ${body.openai_message}` : "";
        throw new Error(`${body?.error || `Session request failed (${res.status})`}${detail}`);
      }
      const ephemeralKey = body.client_secret || body.session?.client_secret?.value;
      const model = body.model || "gpt-realtime-2";
      if (!ephemeralKey) throw new Error("No ephemeral client_secret returned.");

      let greeted = false;
      const greet = () => {
        if (greeted) return;
        greeted = true;
        setStatus("thinking");
        clientRef.current?.requestInitialGreeting(opts.initialGreeting);
      };

      const client = new RealtimeClient({
        ephemeralKey,
        model,
        onEvent: handleEvent,
        onRemoteAudioTrack: (s) => {
          setAudioStream(s);
          meterRef.current?.add(s); // agent voice feeds the breathing edges
        },
        // Fire the proactive greeting the moment the data channel is open so
        // the assistant speaks first instead of waiting for the guest.
        onOpen: () => greet(),
        onConnectionState: (s) => {
          if (s === "failed" || s === "disconnected" || s === "closed") {
            setStatus((prev) => (prev === "error" ? prev : "idle"));
          }
        }
      });
      clientRef.current = client;
      await client.connect();
      // Feed the guest's mic into the meter and begin measuring loudness.
      if (client.localStream) meterRef.current?.add(client.localStream);
      meterRef.current?.start();
      setStatus("listening");
      // Fallback in case the open event was missed before the handler attached.
      setTimeout(greet, 600);
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus("error");
    }
  }, [handleEvent, opts.adminPin, opts.agent, opts.initialGreeting]);

  const stop = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    meterRef.current?.stop();
    meterRef.current = null;
    levelRef.current = 0;
    setStatus("idle");
    setAudioStream(null);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      clientRef.current?.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.close();
      clientRef.current = null;
      meterRef.current?.stop();
      meterRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    transcript,
    audioStream,
    muted,
    levelRef,
    start,
    stop,
    toggleMute
  };
}
