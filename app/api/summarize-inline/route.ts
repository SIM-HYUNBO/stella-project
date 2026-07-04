export async function POST(req: Request) {
  const { title, text } = await req.json();
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ summary: "AI 키가 없어요." });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "회의 내용을 핵심안건, 결정사항, Action Item으로 요약해라." },
        { role: "user", content: `제목:${title}\n내용:${text}` },
      ],
    }),
  });
  const data = await res.json();
  return Response.json({ summary: data.choices?.[0]?.message?.content });
}
