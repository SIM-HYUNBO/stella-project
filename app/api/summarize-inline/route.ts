import OpenAI from "openai";

export async function POST(req: Request) {
  const { title, text } = await req.json();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "회의 내용을 핵심안건, 결정사항, Action Item으로 요약해라.",
      },
      {
        role: "user",
        content: `제목:${title}\n내용:${text}`,
      },
    ],
  });

  return Response.json({
    summary: result.choices[0].message.content,
  });
}