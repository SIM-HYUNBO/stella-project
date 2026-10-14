export type AIMedia = {
  kind: "image" | "video";
  name: string;
  frames: string[];
  duration?: number;
};

export function mediaHistory(messages: { role: string; content: string; media?: AIMedia }[]) {
  const lastMedia = messages.reduce((last, message, index) => message.media ? index : last, -1);
  return messages.map((message, index) => ({
    role: message.role === "ai" ? "assistant" : message.role,
    content: message.content,
    ...(message.media ? index === lastMedia ? { media: message.media } : { content: `${message.content}\n[이전 첨부: ${message.media.name}, 현재 요청에는 원본 이미지가 포함되지 않음]` } : {}),
  }));
}

function frame(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1024 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 준비할 수 없어.");
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.65, 0.5, 0.35]) {
    const result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= 220000) return result;
  }
  throw new Error("이미지가 복잡해서 너무 커. 크기를 줄여서 다시 올려 줘.");
}

function waitFor(target: HTMLMediaElement | HTMLImageElement, event: string, start: () => void) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); target.removeEventListener(event, ready); target.removeEventListener("error", failed); };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("이 파일을 읽지 못했어. JPG·PNG 사진이나 MP4 동영상으로 다시 올려 줘.")); };
    const timer = setTimeout(failed, 20000);
    target.addEventListener(event, ready, { once: true }); target.addEventListener("error", failed, { once: true });
    start();
  });
}

export async function prepareAIMedia(file: File): Promise<AIMedia> {
  const videoFile = file.type.startsWith("video/");
  if (!videoFile && !file.type.startsWith("image/")) throw new Error("사진이나 동영상 파일을 골라 줘.");
  if (file.size > (videoFile ? 50 : 15) * 1024 * 1024) throw new Error(videoFile ? "동영상은 50MB 이하로 올려 줘." : "사진은 15MB 이하로 올려 줘.");
  const url = URL.createObjectURL(file);
  let video: HTMLVideoElement | undefined;
  try {
    if (!videoFile) {
      const img = new Image();
      await waitFor(img, "load", () => { img.src = url; });
      return { kind: "image", name: file.name.slice(0, 150), frames: [frame(img, img.naturalWidth, img.naturalHeight)] };
    }
    video = document.createElement("video"); video.muted = true; video.playsInline = true; video.preload = "auto";
    await waitFor(video, "loadeddata", () => { video!.src = url; video!.load(); });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 60) throw new Error("동영상은 1분 이하로 잘라서 올려 줘.");
    const frames: string[] = [];
    for (const fraction of [0.1, 0.5, 0.9]) {
      await waitFor(video, "seeked", () => { video!.currentTime = duration * fraction; });
      frames.push(frame(video, video.videoWidth, video.videoHeight));
    }
    return { kind: "video", name: file.name.slice(0, 150), frames, duration };
  } finally {
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    URL.revokeObjectURL(url);
  }
}
