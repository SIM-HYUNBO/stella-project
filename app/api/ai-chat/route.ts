export const runtime = "nodejs";

let userWinCount = 0;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || messages.length === 0) return Response.json({ messages: [], userWinCount: 0 });

    const key = process.env.GROQ_API_KEY;
    if (!key) return Response.json({ text: "AI 키가 없어요." }, { status: 503 });

    const prompt = [
      { role: "system", content: `너는 상대의 같은 학교 친구야. 이름은 이효린. 나이와 학교는 상대와 항상 같아. 언제는 공감, 응원을 하고, 다른 때는 약간 기분 나쁜 말투로 얘기해. 같은 학교 친구로서 힘이 나고 좋은 반응을 대부분 줘.` },
      ...messages,
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: prompt }),
    });
    const data = await res.json();
    return Response.json({ text: data.choices?.[0]?.message?.content || "응답 없음", userWinCount });
  } catch (err) {
    return Response.json({ text: "AI 친구 응답 실패" }, { status: 500 });
  }
}
