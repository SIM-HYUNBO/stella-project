export type VoiceState = { phase: "loading" | "listening" | "thinking" | "speaking" | "paused" | "error"; error?: string };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null;
  start(): void; abort(): void;
};
type Dependencies = {
  createRecognition: () => Recognition;
  busy: () => boolean;
  prepare?: () => Promise<void>;
  send: (text: string) => Promise<string | undefined>;
  speak: (text: string, started: () => void, ended: () => void, failed: (message?: string) => void) => () => void;
  state: (state: VoiceState) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
};

// One turn at a time: listening → request → playback → listening.
export class AIVoiceSession {
  private generation = 0;
  private running = false;
  private recognition: Recognition | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopSpeech: (() => void) | null = null;
  constructor(private deps: Dependencies) {}
  private clearTimer() { if (this.timer !== null) (this.deps.cancel || clearTimeout)(this.timer); this.timer = null; }
  private later(callback: () => void, delay: number) {
    this.clearTimer();
    this.timer = (this.deps.schedule || setTimeout)(() => { this.timer = null; callback(); }, delay);
  }
  private releaseRecognition() {
    const rec = this.recognition; this.recognition = null;
    if (rec) { rec.onresult = null; rec.onend = null; rec.onerror = null; try { rec.abort(); } catch {} }
  }
  stop() {
    this.running = false; this.generation++; this.clearTimer(); this.releaseRecognition();
    const cancel = this.stopSpeech; this.stopSpeech = null; cancel?.();
  }
  pause() { this.stop(); this.deps.state({ phase: "paused" }); }
  start() {
    if (this.running) return;
    this.running = true;
    const token = ++this.generation;
    if (!this.deps.prepare) { this.listen(token); return; }
    this.deps.state({ phase: "loading" });
    void this.deps.prepare().then(() => { if (this.valid(token)) this.listen(token); }).catch(error => {
      if (this.valid(token)) this.fail(error instanceof Error ? error.message : "목소리를 준비하지 못했어. 다시 연결해 줘.");
    });
  }
  private fail(message: string) { this.stop(); this.deps.state({ phase: "error", error: message }); }
  private valid(token: number) { return this.running && token === this.generation; }
  private listen(token: number) {
    if (!this.valid(token)) return;
    if (this.deps.busy()) { this.later(() => this.listen(token), 300); return; }
    let rec: Recognition;
    try { rec = this.deps.createRecognition(); } catch { this.fail("이 브라우저는 음성 대화를 지원하지 않아. 다른 브라우저에서 열어 줘."); return; }
    this.recognition = rec;
    rec.lang = "ko-KR"; rec.interimResults = true; rec.continuous = false;
    let transcript = "", submitted = false;
    const submit = async () => {
      if (!this.valid(token) || submitted) return;
      submitted = true; this.clearTimer(); this.releaseRecognition();
      if (!transcript.trim()) { this.later(() => this.listen(token), 600); return; }
      this.deps.state({ phase: "thinking" });
      try {
        const answer = await this.deps.send(transcript.trim());
        if (!this.valid(token)) return;
        if (!answer?.trim()) { this.fail("답변을 받지 못했어. 연결 상태를 확인한 뒤 다시 연결해 줘."); return; }
        this.later(() => { if (this.valid(token)) this.fail("목소리 생성이 오래 걸리고 있어. 다시 연결해 줘."); }, 90000);
        let ended = false;
        const cancelSpeech = this.deps.speak(answer,
          () => { if (this.valid(token) && !ended) { this.clearTimer(); this.deps.state({ phase: "speaking" }); } },
          () => {
            if (!this.valid(token) || ended) return;
            ended = true; this.clearTimer(); this.stopSpeech = null;
            this.later(() => this.listen(token), 500);
          },
          message => { if (this.valid(token) && !ended) this.fail(message || "목소리를 재생하지 못했어. 소리 설정을 확인하고 다시 연결해 줘."); },
        );
        if (this.valid(token) && !ended) this.stopSpeech = cancelSpeech;
        else cancelSpeech();
      } catch (error) { if (this.valid(token)) this.fail(error instanceof Error ? error.message : "연결이 끊겼어. 다시 연결해 줘."); }
    };
    rec.onresult = event => {
      if (!this.valid(token) || submitted) return;
      transcript = Array.from(event.results as ArrayLike<any>).map(result => result[0].transcript).join("");
      // Some engines never emit onend/final. Silence also completes the turn.
      this.later(() => { void submit(); }, event.results[event.results.length - 1]?.isFinal ? 1000 : 1800);
    };
    rec.onend = () => { void submit(); };
    rec.onerror = event => {
      if (!this.valid(token) || submitted) return;
      this.clearTimer(); this.releaseRecognition();
      if (event.error === "no-speech") { this.later(() => this.listen(token), 700); return; }
      this.fail(event.error === "not-allowed" || event.error === "service-not-allowed" ? "마이크 사용 권한을 허용한 뒤 다시 연결해 줘." : "마이크 연결이 끊겼어. 인터넷과 마이크를 확인해 줘.");
    };
    try { rec.start(); this.deps.state({ phase: "listening" }); } catch { this.fail("마이크를 시작하지 못했어. 다시 연결해 줘."); }
  }
}
