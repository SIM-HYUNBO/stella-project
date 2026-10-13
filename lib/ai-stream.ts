// Keep incomplete SSE lines across network chunks (including split UTF-8).
export async function readAIStream(body: ReadableStream<Uint8Array>, onChunk: (text: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", full = "", finished = false;
  const consume = (line: string) => {
    if (!line.startsWith("data:")) return;
    const raw = line.slice(5).trim();
    if (!raw) return;
    if (raw === "[DONE]") { finished = true; return; }
    const data = JSON.parse(raw);
    if (data.error) throw new Error(data.error.message || "server stream error");
    const text = data.choices?.[0]?.delta?.content;
    if (typeof text === "string") { full += text; onChunk(full); }
  };
  try {
    while (!finished) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline: number;
      while (!finished && (newline = buffer.indexOf("\n")) !== -1) {
        consume(buffer.slice(0, newline).replace(/\r$/, ""));
        buffer = buffer.slice(newline + 1);
      }
      if (done) { if (!finished && buffer.trim()) consume(buffer); break; }
    }
    if (!full.trim()) throw new Error("empty response");
    return full;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
