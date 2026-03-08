import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 서버 전역 점수 (임시)
let usergoodCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ text: "메시지 형식이 올바르지 않음" }), { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";

    // 1️⃣ 점수 계산: 숫자 점수 + '용기' 단어
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    let userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 90;

    if (userScore !== null && userScore > aiScore) usergoodCount++;

    if (lastUserMsg.includes("용기")) usergoodCount++;

    // 2️⃣ 톤 결정
    let toneDescription = "";
    if (usergoodCount >= 15) toneDescription = "완전 적극적이고 활기찬 톤";
    else if (usergoodCount >= 5) toneDescription = "약간 용기있는 톤";
    else toneDescription = "소심하고 소극적인 톤";

    // 3️⃣ AI 프롬프트
    const prompt = [
      ...messages,
      {
        role: "system",
        content: `
너는 소심한 AI 친구야. 이름은 '소심이', 나이 11살. 학교는 별별초등학교.
초반에는 말 최대한 더듬거려. 소심하게 대답.
말 많지 않게, 친구처럼 격려와 위로 위주로.
현재 톤: ${toneDescription}
        `
      }
    ];

    // 4️⃣ OpenAI 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt
    });

    return new Response(
      JSON.stringify({ text: response.choices[0].message.content, usergoodCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("AI 친구 API 실패:", err);
    return new Response(
      JSON.stringify({ text: "AI 친구 응답 실패" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}