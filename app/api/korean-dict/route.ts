import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { word } = await req.json();
  const apiKey = process.env.KOR_DICT_API_KEY; // .env.local에 발급 키 저장

  try {
    const res = await fetch(
      `https://stdict.korean.go.kr/api/search.do?key=${apiKey}&q=${encodeURIComponent(
        word
      )}&type=json`
    );

    const json = await res.json();
    const item = json.channel?.item?.[0];
    const definition = item?.sense?.[0]?.definition || "뜻을 찾을 수 없습니다.";

    return NextResponse.json({ meaning: definition });
  } catch (error) {
    return NextResponse.json(
      { meaning: "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
