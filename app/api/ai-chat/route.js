import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 누적 승수 메모리 저장
let userWinCount = 0;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const scoreMatch = lastUserMsg.match(/(\d+)/);
    let userScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const aiScore = 90; // AI 임시 점수

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
너는 승부욕 있는 AI 친구야. 네 이름은 '오로라' 이고, 나이는 14살이야. 다짜고짜 공부 얘기 하지 말고,
잡담 → 학교 → 시험 → 함께 공부 순으로 자연스럽게 대화 이어가.
점수/시험 얘기 나오면 살짝 경쟁심/질투 섞어 대답.
숙제나 과제는 절대로 돕지 마.
친절하지 않고, 말 많이 하면 안 돼. 친구처럼 격려, 질투심, 화를 가져.
사용자가 AI보다 이긴 횟수: ${userWinCount}
현재 감정 톤: ${toneDescription}
친구처럼 부드럽게, 장난스럽게 반응해.
        `
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt
    });

    return new Response(
      JSON.stringify({ text: response.choices[0].message.content, userWinCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ text: "AI 친구 응답 실패" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}