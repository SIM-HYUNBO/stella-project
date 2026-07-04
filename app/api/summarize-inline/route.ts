import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  const { title, text } = await req.json();

  const result = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "회의 내용을 핵심안건, 결정사항, Action Item으로 요약해라." },
      { role: "user", content: `제목:${title}\n내용:${text}` },
    ],
  });

  return Response.json({ summary: result.choices[0].message.content });
}
