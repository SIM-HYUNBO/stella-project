import { loadTextToSpeech, loadVoiceStyle } from './supertonic-helper.js';

const ASSETS = 'https://huggingface.co/Supertone/supertonic-2/resolve/75e6727618a02f323c720cba9478152d4bc16ca4';
let engine;
let style;
let initializing;
let queue = Promise.resolve();

async function handle({ id, type, text }) {
  try {
    if (!engine) {
      initializing ||= (async () => {
        const result = await loadTextToSpeech(`${ASSETS}/onnx`, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }, (_name, step, total) => {
          self.postMessage({ id, type: 'progress', message: `목소리 모델을 준비하고 있어 · ${step}/${total}` });
        });
        const voice = await loadVoiceStyle([`${ASSETS}/voice_styles/F1.json`]);
        engine = result.textToSpeech;
        style = voice;
      })();
      await initializing;
    }
    if (type === 'init') { self.postMessage({ id, type: 'ready' }); return; }
    if (type !== 'speak' || typeof text !== 'string' || !text.trim() || text.length > 6000) throw Error('Invalid voice request');
    const result = await engine.call(text, 'ko', style, 5, 1.0);
    const samples = Float32Array.from(result.wav);
    self.postMessage({ id, type: 'audio', samples, sampleRate: engine.sampleRate }, [samples.buffer]);
  } catch {
    initializing = undefined;
    self.postMessage({ id, type: 'error', message: '무료 한국어 목소리를 준비하지 못했어. 인터넷 연결과 기기 메모리를 확인한 뒤 다시 연결해 줘.' });
  }
}
self.onmessage = event => { queue = queue.then(() => handle(event.data)); };
