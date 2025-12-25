// app/video-c/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";

// IndexedDB helpers (아래 섹션 코드 넣기)
import { saveVideoBlob, listSavedVideos, loadVideoBlob, deleteVideo } from "./store";

type FF = {
  createFFmpeg: (opts: { log: boolean }) => any;
  fetchFile: (f: Blob | File | string) => Promise<Uint8Array>;
};

export default function VideoCreator() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Editing state
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [muted, setMuted] = useState(false);

  // Saved videos list
  const [saved, setSaved] = useState<{ key: string; name: string; size: number }[]>([]);

  useEffect(() => {
    refreshSaved();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const refreshSaved = async () => {
    const items = await listSavedVideos();
    setSaved(items);
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9,opus" });
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };

    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const applyTrimOrMute = async () => {
    if (!recordedBlob) return;
    setProcessing(true);
    try {
      const { createFFmpeg, fetchFile } = (await import("@ffmpeg/ffmpeg")) as unknown as FF;
      const ffmpeg = createFFmpeg({ log: true });
      if (!(ffmpeg as any).isLoaded()) await (ffmpeg as any).load();

      const inputName = "input.webm";
      const outputName = "output.mp4";
      (ffmpeg as any).FS("writeFile", inputName, await fetchFile(recordedBlob));

      // Build ffmpeg args
      const args: string[] = ["-i", inputName];
      if (endSec > 0) {
        args.push("-ss", String(startSec)); // start
        args.push("-to", String(endSec));   // end
      }
      if (muted) {
        args.push("-an"); // drop audio
      }
      // Re-encode to mp4/h264+aac (broad compatibility)
      args.push("-c:v", "libx264", "-c:a", "aac", outputName);

      await (ffmpeg as any).run(...args);

      const data = (ffmpeg as any).FS("readFile", outputName);
      const outBlob = new Blob([data.buffer], { type: "video/mp4" });
      setRecordedBlob(outBlob);
      const url = URL.createObjectURL(outBlob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.error(e);
      alert("편집 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const saveToLocal = async () => {
    if (!recordedBlob) {
      alert("저장할 영상이 없습니다.");
      return;
    }
    const name = `video_${new Date().toISOString()}.${recordedBlob.type.includes("mp4") ? "mp4" : "webm"}`;
    const key = await saveVideoBlob(name, recordedBlob);
    await refreshSaved();
    alert(`저장 완료: ${name}`);
  };

  const loadSavedForPreview = async (key: string) => {
    const blob = await loadVideoBlob(key);
    if (!blob) return;
    setRecordedBlob(blob);
    const url = URL.createObjectURL(blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const removeSaved = async (key: string) => {
    await deleteVideo(key);
    await refreshSaved();
  };

  return (
    <div className="p-6 ml-11 max-w-3xl">
      <h1 className="text-2xl font-bold text-orange-900 dark:text-white mb-4">Video-c: 촬영 · 편집 · 저장</h1>

      {/* Camera */}
      <div className="mb-4">
        <video ref={videoRef} className="w-full rounded bg-black" muted playsInline />
        <div className="mt-2 flex gap-2">
          <button onClick={startCamera} className="px-3 py-2 bg-green-500 text-white rounded">카메라 켜기</button>
          <button onClick={stopCamera} className="px-3 py-2 bg-gray-500 text-white rounded">카메라 끄기</button>
          {!recording ? (
            <button onClick={startRecording} className="px-3 py-2 bg-blue-600 text-white rounded">녹화 시작</button>
          ) : (
            <button onClick={stopRecording} className="px-3 py-2 bg-red-600 text-white rounded">녹화 정지</button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-orange-900">미리보기</h2>
        {previewUrl ? (
          <video src={previewUrl} controls className="w-full rounded" />
        ) : (
          <p className="text-gray-600">녹화 후 미리보기가 표시됩니다.</p>
        )}
      </div>

      {/* Editing */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-orange-900">편집</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-700">시작(초)</span>
            <input
              type="number"
              min={0}
              value={startSec}
              onChange={(e) => setStartSec(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-700">끝(초)</span>
            <input
              type="number"
              min={0}
              value={endSec}
              onChange={(e) => setEndSec(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            <span className="text-sm text-gray-700">음소거</span>
          </label>
          <button
            onClick={applyTrimOrMute}
            disabled={processing || !recordedBlob}
            className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
          >
            {processing ? "처리 중..." : "적용"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">트림은 시작/끝 시간을 지정하고 적용을 누르세요. 음소거는 오디오를 제거합니다.</p>
      </div>

      {/* Save */}
      <div className="mb-6">
        <button onClick={saveToLocal} className="px-4 py-2 bg-blue-500 text-white rounded">로컬 저장(IndexedDB)</button>
      </div>

      {/* Saved items */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-orange-900">저장된 영상</h2>
        {saved.length === 0 ? (
          <p className="text-gray-600">저장된 영상이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((v) => (
              <li key={v.key} className="flex items-center justify-between border rounded px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-gray-500">{(v.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadSavedForPreview(v.key)} className="px-3 py-1 bg-gray-200 rounded">
                    불러와 미리보기
                  </button>
                  <button onClick={() => removeSaved(v.key)} className="px-3 py-1 bg-red-500 text-white rounded">
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
