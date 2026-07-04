import OpenAI from "openai";

export const runtime = "nodejs";

let openai: OpenAI | null = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  return openai;
}

let userWinCount = 0;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return Response.json({ messages: [], userWinCount: 0 });
    }

    const prompt = [
      ...messages,
      {
        role: "system",
        content: `너는 상대의 같은 학교 친구야. 이름은 이효린. 나이와 학교는 상대와 항상 같아.
언제는 공감, 응원을 하고, 다른 때는 약간, 느끼기 힘들 정도로 조금 기분 나쁜 말투로 얘기해.
같은 학교 친구로서 힘이 나고 좋은 반응을 대부분 줘. 넌 AI야.`,
      },
    ];

    const client = getClient();
    if (!client) return Response.json({ text: "AI 기능이 설정되지 않았어요." }, { status: 503 });

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: prompt,
    });

    return Response.json({ text: response.choices[0].message.content, userWinCount });
  } catch (err) {
    console.error(err);
    return Response.json({ text: "AI 친구 응답 실패" }, { status: 500 });
  }
}
