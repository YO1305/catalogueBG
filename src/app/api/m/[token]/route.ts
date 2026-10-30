import { isRemoteMediaUrl } from "@/lib/publicMedia";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  let url = "";
  try {
    if (!/^[0-9a-f]+$/i.test(token) || token.length % 2) return new Response("bad", { status: 400 });
    url = Buffer.from(token, "hex").toString("utf8");
  } catch {
    return new Response("bad", { status: 400 });
  }
  if (!isRemoteMediaUrl(url)) return new Response("bad", { status: 400 });
  const upstream = await fetch(url, { cache: "force-cache" });
  if (!upstream.ok || !upstream.body) return new Response("missing", { status: 404 });
  const type = upstream.headers.get("content-type") ?? "image/webp";
  if (!type.startsWith("image/")) return new Response("missing", { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=2592000, immutable",
    },
  });
}
