export const runtime = "nodejs";

let prankWinCount = 0;

export async function POST(req) {
  try {
    const { messages = [] } = await req.json();
    if (!Array.isArray(messages)) return Response.json({ text: "메시지 형식 오류" }, { status: 400 });

    const key = process.env.GROQ_API_KEY;
    if (!key) return Response.json({ text: "장난이가 잠깐 쉬는 중이야!" });

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    const userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    if (userScore !== null && userScore > 85) prankWinCount++;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "너는 장난꾸러기 AI 친구야. 이름: 장난이, 나이: 12살. 항상 장난스럽고 말장난 좋아함. 친구처럼 가볍게 농담하며 대답해." },
          ...messages,
        ],
      }),
    });
    const data = await res.json();
    return Response.json({ text: data.choices?.[0]?.message?.content || "장난이가 농담 생각중!", prankWinCount });
  } catch {
    return Response.json({ text: "장난이가 잠깐 쉬는 중이야!" }, { status: 500 });
  }
}
