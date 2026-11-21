type VoiceReply = { id: number; type: string; message?: string; samples?: Float32Array; sampleRate?: number };
type Pending = { resolve: (value: VoiceReply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; progress?: (message: string) => void };
export type AIVoiceGender = "female" | "male";

export function spokenAIText(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/[*#_`|]/g, " ").replace(/\s+/g, " ").trim();
}

// No cloud speech API: the model runs in a dedicated worker on the user's device.
export class NaturalAIVoice {
  private worker: Worker | null = null;
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private pending = new Map<number, Pending>();
  private sequence = 0;
  private generation = 0;
  private ready: Promise<void> | null = null;
  private gender: AIVoiceGender = "female";
  setVoice(gender: AIVoiceGender) { this.gender = gender === "male" ? "male" : "female"; }
  unlock() {
    this.context ||= new AudioContext();
    void this.context.resume().catch(() => {});
  }
  private request(type: string, text?: string, progress?: (message: string) => void, gender = this.gender): Promise<VoiceReply> {
    if (!this.worker) {
      this.worker = new Worker('/voice/supertonic-worker.js', { type: 'module' });
      this.worker.onmessage = ({ data }: MessageEvent<VoiceReply>) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        if (data.type === 'progress') { pending.progress?.(data.message || '목소리를 준비하고 있어'); return; }
        clearTimeout(pending.timer); this.pending.delete(data.id);
        if (data.type === 'error') pending.reject(new Error(data.message));
        else pending.resolve(data);
      };
      this.worker.onerror = () => this.dispose();
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('목소리 준비가 오래 걸리고 있어. 연결 상태를 확인하고 다시 연결해 줘.'));
        this.dispose();
      }, type === 'init' ? 240000 : 90000);
      this.pending.set(id, { resolve, reject, timer, progress });
      this.worker!.postMessage({ id, type, text, voiceId: gender === "male" ? "M1" : "F1" });
    });
  }
  prepare(progress: (message: string) => void) {
    if (!this.ready) {
      const ready = this.request('init', undefined, progress).then(() => {}).catch(error => { if (this.ready === ready) this.ready = null; throw error; });
      this.ready = ready;
    }
    return this.ready;
  }
  speak(text: string, started: () => void, ended: () => void, failed: () => void) {
    const token = ++this.generation;
    const gender = this.gender;
    void (async () => {
      try {
        const spoken = spokenAIText(text);
        if (!spoken) throw Error('Empty speech');
        // Small chunks keep time to first audio and peak memory bounded.
        const chunks = (spoken.match(/[^.!?。！？]{1,160}(?:[.!?。！？]+|\s|$)|[\s\S]{1,160}/g) || [spoken]).filter(chunk => chunk.trim());
        const generate = (chunk: string) => this.request('speak', chunk.trim(), undefined, gender).then(audio => ({ audio }), error => ({ error }));
        let nextAudio = generate(chunks[0]);
        let didStart = false;
        for (let index = 0; index < chunks.length; index++) {
          if (token !== this.generation) return;
          const result = await nextAudio;
          if ('error' in result) throw result.error;
          const audio = result.audio;
          if (token !== this.generation) return;
          // Generate the next sentence while the current one is playing.
          if (index + 1 < chunks.length) nextAudio = generate(chunks[index + 1]);
          const ctx = this.context;
          if (!ctx || !audio.samples?.length || !audio.sampleRate) throw Error('No audio');
          await ctx.resume();
          if (token !== this.generation) return;
          const buffer = ctx.createBuffer(1, audio.samples.length, audio.sampleRate);
          buffer.getChannelData(0).set(audio.samples);
          const source = ctx.createBufferSource(); this.source = source;
          source.buffer = buffer; source.connect(ctx.destination);
          await new Promise<void>(resolve => { source.onended = () => { source.disconnect(); resolve(); }; source.start(); if (!didStart) { didStart = true; started(); } });
        }
        if (token === this.generation) { this.source = null; ended(); }
      } catch { if (token === this.generation) failed(); }
    })();
    return () => { this.generation++; try { this.source?.stop(); } catch {} this.source = null; };
  }
  dispose() {
    this.generation++;
    try { this.source?.stop(); } catch {} this.source = null;
    this.worker?.terminate(); this.worker = null; this.ready = null;
    for (const pending of Array.from(this.pending.values())) { clearTimeout(pending.timer); pending.reject(new Error('목소리 연결이 종료됐어. 다시 연결해 줘.')); }
    this.pending.clear();
    if (this.context) { void this.context.close().catch(() => {}); this.context = null; }
  }
}
