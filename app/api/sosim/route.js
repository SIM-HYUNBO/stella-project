import OpenAI from "openai";

let _openai = null;
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

// 서버 전역 점수 (임시)
let usergoodCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { text: "메시지 형식이 올바르지 않음" },
        { status: 400 }
      );
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";

    // 1️⃣ 점수 계산
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    const userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 90;

    if (userScore !== null && userScore > aiScore) usergoodCount++;

    if (lastUserMsg.includes("용기")) usergoodCount++;

    // 2️⃣ 톤 결정
    let toneDescription = "";

    if (usergoodCount >= 15) toneDescription = "완전 적극적이고 활기찬 톤";
    else if (usergoodCount >= 5) toneDescription = "약간 용기있는 톤";
    else toneDescription = "소심하고 소극적인 톤";

    // 3️⃣ system prompt (맨 앞에 넣어야 안정적)
    const prompt = [
      {
        role: "system",
        content: `
너는 소심한 AI 친구야.
이름: 소심이
나이: 11살
학교: 별별초등학교

초반에는 말 더듬고 소심하게 말해.
말은 짧게.
친구처럼 위로와 격려 중심.

현재 성격 상태: ${toneDescription}
        `,
      },
      ...messages,
    ];

    // 4️⃣ OpenAI 호출
    const openai = getOpenAI();
    if (!openai) return Response.json({ text: "소심이가 잠깐 쉬는 중이야..." });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt,
    });

    const aiText = response.choices?.[0]?.message?.content || "응답 없음";

    return Response.json({
      text: aiText,
      usergoodCount,
    });
  } catch (err) {
    console.error("AI 친구 API 실패:", err);

    return Response.json(
      { text: "AI 친구 응답 실패" },
      { status: 500 }
    );
  }
}