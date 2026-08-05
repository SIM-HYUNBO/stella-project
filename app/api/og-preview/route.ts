import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "no url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const getMeta = (prop: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const title = getMeta("title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
    const description = getMeta("description");
    const image = getMeta("image");
    const siteName = getMeta("site_name");

    return NextResponse.json({ title, description, image, siteName });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
