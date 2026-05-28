// Measures combined loudness of one or more MediaStreams (mic + agent audio)
// and reports a smoothed 0..1 level via a callback, driven by requestAnimationFrame.
export class AudioMeter {
  private ctx: AudioContext | null = null;
  private analysers: AnalyserNode[] = [];
  private raf: number | null = null;
  private level = 0;
  private buf = new Uint8Array(256);

  constructor(private onLevel: (level: number) => void) {}

  add(stream: MediaStream) {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new Ctor();
      }
      const src = this.ctx.createMediaStreamSource(stream);
      const an = this.ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an); // analyse only — never connect to destination (no feedback)
      this.analysers.push(an);
    } catch {
      // Web Audio unavailable / blocked — meter just stays at 0.
    }
  }

  start() {
    this.ctx?.resume?.().catch(() => {});
    if (this.raf != null) return;
    const tick = () => {
      let peak = 0;
      for (const an of this.analysers) {
        an.getByteTimeDomainData(this.buf);
        let sum = 0;
        for (let i = 0; i < this.buf.length; i++) {
          const v = (this.buf[i] - 128) / 128;
          sum += v * v;
        }
        peak = Math.max(peak, Math.sqrt(sum / this.buf.length));
      }
      // Smooth, and scale up so normal speech reaches a visible range.
      this.level = this.level * 0.82 + Math.min(1, peak * 3.2) * 0.18;
      this.onLevel(this.level);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  stop() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.analysers = [];
    this.level = 0;
    this.onLevel(0);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
