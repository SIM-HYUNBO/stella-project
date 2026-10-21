import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))
    || (a === 192 && b === 0) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113));
}

export async function previewHTML(input: string, hops = 0): Promise<{ html: string; url: string }> {
  const url = new URL(input);
  if (input.length > 2048 || !["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port)) || hops > 3) throw Error("invalid_url");
  const hostname = url.hostname;
  const addresses = isIP(hostname) ? [{ address: hostname, family: 4 }] : await new Promise<{ address: string; family: number }[]>((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error("dns_timeout")), 3000);
    lookup(hostname, { family: 4, all: true }).then(resolve, reject).finally(() => clearTimeout(timeout));
  });
  if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw Error("private_address");
  // Pin the validated address: the HTTP connection cannot resolve the host again.
  const result = await new Promise<{ html?: string; redirect?: string }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      headers: { "User-Agent": "Wagie-LinkPreview/1.0", Accept: "text/html", "Accept-Encoding": "identity" },
      lookup: ((_host: string, options: any, callback: any) => options?.all ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, 4)) as any,
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        try { resolve({ redirect: new URL(response.headers.location, url).href }); } catch { reject(Error("invalid_redirect")); }
        return;
      }
      if (response.statusCode !== 200 || !String(response.headers["content-type"]).includes("text/html")) { response.resume(); reject(Error("not_html")); return; }
      let length = 0; const chunks: Buffer[] = [];
      response.on("data", chunk => { length += chunk.length; if (length > 512000) { request.destroy(Error("too_large")); return; } chunks.push(Buffer.from(chunk)); });
      response.on("error", reject);
      response.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
    });
    const timeout = setTimeout(() => request.destroy(Error("timeout")), 5000);
    request.on("close", () => clearTimeout(timeout)); request.on("error", reject); request.end();
  });
  return result.redirect ? previewHTML(result.redirect, hops + 1) : { html: result.html!, url: url.href };
}
