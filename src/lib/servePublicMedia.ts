import { decodeMediaToken } from "@/lib/publicMedia";

export async function servePublicMedia(token: string): Promise<Response> {
  const url = decodeMediaToken(token);
  if (!url) return new Response("bad", { status: 400 });
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
