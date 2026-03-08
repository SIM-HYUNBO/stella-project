import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 임시 점수 변수 (서버 전역)
let prankWinCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ text: "메시지 형식이 올바르지 않음" }),
        { status: 400 }
      );
    }

    // 마지막 메시지 숫자로 점수 카운트
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    const userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 85;

    if (userScore !== null && userScore > aiScore) prankWinCount++;

    // OpenAI 프롬프트
    const prompt = [
      ...messages,
      {
        role: "system",
        content: `
너는 장난꾸러기 AI 친구야. 이름은 '장난이', 나이 12살.
친구처럼 장난치고, 말장난 자주 하고, 매번 농담을 해.
말장난 + 장난스러운 격려 중심으로 대답.
        `
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt
    });

    return new Response(
      JSON.stringify({ text: response.choices[0].message.content, prankWinCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("장난꾸러기 AI API 실패:", err);
    return new Response(
      JSON.stringify({ text: "AI 친구 응답 실패" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}