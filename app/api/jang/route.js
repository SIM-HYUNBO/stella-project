import OpenAI from "openai";

export const runtime = "nodejs";

let _openai = null;
const getOpenAI = () => {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  return _openai;
};

let prankWinCount = 0;

export async function POST(req) {
  try {
    const body = await req.json();
    const messages = body.messages || [];

    if (!Array.isArray(messages)) {
      return Response.json({ text: "메시지 형식 오류" }, { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    const userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 85;

    if (userScore !== null && userScore > aiScore) prankWinCount++;

    const prompt = [
      {
        role: "system",
        content: `너는 장난꾸러기 AI 친구야.\n이름: 장난이\n나이: 12살\n\n항상 장난스럽고 말장난 좋아함.\n친구처럼 가볍게 농담하며 대답해.`,
      },
      ...messages,
    ];

    const openai = getOpenAI();
    if (!openai) return Response.json({ text: "장난이가 잠깐 쉬는 중이야!" });
    const response = await openai.chat.completions.create({ model: "llama-3.3-70b-versatile", messages: prompt });

    const text = response?.choices?.[0]?.message?.content || "장난이가 농담 생각중이야!";
    return Response.json({ text, prankWinCount });
  } catch (err) {
    console.error("장난꾸러기 AI API 실패:", err);
    return Response.json({ text: "장난이가 잠깐 쉬는 중이야!" }, { status: 500 });
  }
}
