import { NextRequest, NextResponse } from "next/server";
import { previewHTML } from "@/lib/preview-fetch";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "no url" }, { status: 400 });

  try {
    const { html, url: finalUrl } = await previewHTML(url);

    const getMeta = (prop: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const title = getMeta("title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
    const description = getMeta("description");
    let image = "";
    try { const candidate = new URL(getMeta("image"), finalUrl); if (getMeta("image") && ["http:", "https:"].includes(candidate.protocol)) image = candidate.href; } catch {}
    const siteName = getMeta("site_name");

    return NextResponse.json({ title, description, image, siteName });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
