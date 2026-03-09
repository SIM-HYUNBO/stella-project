import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let userWinCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);

    let userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 90;

    if (userScore !== null && userScore > aiScore) userWinCount++;

    let toneDescription = "";
    if (userWinCount >= 10) toneDescription = "화 잔뜩 내고 짜증내는 톤";
    else if (userWinCount >= 5) toneDescription = "약간 질투/장난 톤";
    else toneDescription = "친근하고 가벼운 톤";

    const prompt = [
      ...messages,
      {
        role: "system",
        content: `
너는 승부욕 있는 AI 친구야. 이름은 오로라, 14살.
잡담 → 학교 → 시험 → 공부 순으로 자연스럽게 이어가.
숙제는 절대 도와주지 마.
사용자가 AI보다 이긴 횟수: ${userWinCount}
현재 감정 톤: ${toneDescription}
친구처럼 장난스럽게 반응해.
`,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt,
    });

    return Response.json({
      text: response.choices[0].message.content,
      userWinCount,
    });

  } catch (err) {
    console.error(err);
    return Response.json({ text: "AI 친구 응답 실패" }, { status: 500 });
  }
}