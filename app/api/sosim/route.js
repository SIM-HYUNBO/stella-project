let usergoodCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) return Response.json({ text: "메시지 형식 오류" }, { status: 400 });

    const key = process.env.GROQ_API_KEY;
    if (!key) return Response.json({ text: "소심이가 잠깐 쉬는 중이야..." });

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    const userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    if (userScore !== null && userScore > 90) usergoodCount++;
    if (lastUserMsg.includes("용기")) usergoodCount++;

    const tone = usergoodCount >= 15 ? "완전 적극적이고 활기찬 톤" : usergoodCount >= 5 ? "약간 용기있는 톤" : "소심하고 소극적인 톤";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `너는 소심한 AI 친구야. 이름: 소심이, 나이: 11살, 학교: 별별초등학교. 말 더듬고 소심하게 짧게 말해. 현재 성격: ${tone}` },
          ...messages,
        ],
      }),
    });
    const data = await res.json();
    return Response.json({ text: data.choices?.[0]?.message?.content || "응답 없음", usergoodCount });
  } catch {
    return Response.json({ text: "AI 친구 응답 실패" }, { status: 500 });
  }
}
