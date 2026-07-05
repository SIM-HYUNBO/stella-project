import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, robotName, mode } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    const safeMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt =
      mode === "study"
        ? `
너는 학습용 AI야.

반드시 한국어로만 답해.
말풍선 채팅처럼 답하지 말고, 공부 노트처럼 줄글로 설명해.
중요한 단어나 어구는 [[이런 형식]]으로 표시해.
설명은 친절하지만 너무 장황하지 않게 해.

필요하면 아래 형식을 사용해.

[체크리스트]
- 해야 할 공부 내용

[표]
| 구분 | 내용 |
| --- | --- |
| 핵심 | 설명 |

[단어장]
- 단어: 뜻

[노트]
정리 내용

개인 AI 대화와 학습용 AI 내용을 섞지 마.
`
        : `너는 ${robotName || "AI"} 야. 친근하고 자연스럽게 대화해줘. 너무 길게 말하지 말고 간결하게. 반드시 한국어로만 답해.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...safeMessages,
        ],
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      const errMsg = data?.error?.message || `오류 (${response.status})`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "서버 오류" }, { status: 500 });
  }
}