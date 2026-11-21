import { loadTextToSpeech, loadVoiceStyle } from './supertonic-helper.js';

const ASSETS = 'https://huggingface.co/Supertone/supertonic-2/resolve/75e6727618a02f323c720cba9478152d4bc16ca4';
let engine;
const styles = new Map();
let initializing;
let queue = Promise.resolve();

async function handle({ id, type, text, voiceId = 'F1' }) {
  try {
    if (!['F1', 'M1'].includes(voiceId)) throw Error('Invalid voice');
    if (!engine) {
      initializing ||= (async () => {
        const result = await loadTextToSpeech(`${ASSETS}/onnx`, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }, (_name, step, total) => {
          self.postMessage({ id, type: 'progress', message: `목소리 모델을 준비하고 있어 · ${step}/${total}` });
        });
        engine = result.textToSpeech;
      })();
      await initializing;
    }
    if (!styles.has(voiceId)) styles.set(voiceId, await loadVoiceStyle([`${ASSETS}/voice_styles/${voiceId}.json`]));
    if (type === 'init') { self.postMessage({ id, type: 'ready' }); return; }
    if (type !== 'speak' || typeof text !== 'string' || !text.trim() || text.length > 6000) throw Error('Invalid voice request');
    const result = await engine.call(text, 'ko', styles.get(voiceId), 5, 1.0);
    const samples = Float32Array.from(result.wav);
    self.postMessage({ id, type: 'audio', samples, sampleRate: engine.sampleRate }, [samples.buffer]);
  } catch {
    initializing = undefined;
    self.postMessage({ id, type: 'error', message: '무료 한국어 목소리를 준비하지 못했어. 인터넷 연결과 기기 메모리를 확인한 뒤 다시 연결해 줘.' });
  }
}
self.onmessage = event => { queue = queue.then(() => handle(event.data)); };
