// Browser-side WebRTC client for the OpenAI Realtime API.
// The ephemeral client_secret is created by /api/realtime/customer or /admin
// — the real OPENAI_API_KEY never reaches the browser.

export type RealtimeEventHandler = (event: any) => void;

export type RealtimeClientOptions = {
  ephemeralKey: string;
  model: string;
  onEvent?: RealtimeEventHandler;
  onRemoteAudioTrack?: (stream: MediaStream) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  /** Fires once the data channel is open and the session is ready for events. */
  onOpen?: () => void;
};

export class RealtimeClient {
  pc: RTCPeerConnection | null = null;
  dc: RTCDataChannel | null = null;
  localStream: MediaStream | null = null;
  remoteAudioStream: MediaStream | null = null;
  private opts: RealtimeClientOptions;
  private connected = false;

  constructor(opts: RealtimeClientOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    this.pc = pc;
    pc.onconnectionstatechange = () => {
      this.opts.onConnectionState?.(pc.connectionState);
    };

    const remoteStream = new MediaStream();
    this.remoteAudioStream = remoteStream;
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      this.opts.onRemoteAudioTrack?.(remoteStream);
    };

    // Enable the browser's acoustic echo cancellation, noise suppression, and
    // auto-gain so the mic doesn't pick up the agent's own voice from the
    // device speaker (critical on mobile / speakerphone).
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    this.localStream = mic;
    mic.getTracks().forEach((t) => pc.addTrack(t, mic));

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        this.opts.onEvent?.(event);
      } catch {
        // ignore
      }
    };
    dc.onopen = () => {
      this.connected = true;
      this.opts.onOpen?.();
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const resp = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(this.opts.model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Realtime SDP exchange failed: ${resp.status} ${text}`);
    }
    const answerSdp = await resp.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  send(event: Record<string, unknown>) {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(JSON.stringify(event));
  }

  // Submit a tool result to the conversation WITHOUT triggering a response.
  // The caller decides when to create the follow-up response (only one
  // response may be active at a time).
  sendFunctionOutput(callId: string, output: unknown) {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: typeof output === "string" ? output : JSON.stringify(output)
      }
    });
  }

  createResponse() {
    this.send({ type: "response.create" });
  }

  requestInitialGreeting(prompt?: string) {
    this.send({
      type: "response.create",
      response: prompt ? { instructions: prompt } : {}
    });
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  close() {
    try {
      this.dc?.close();
    } catch {}
    try {
      this.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      this.pc?.close();
    } catch {}
    this.pc = null;
    this.dc = null;
    this.localStream = null;
    this.remoteAudioStream = null;
    this.connected = false;
  }

  get isConnected() {
    return this.connected;
  }
}
