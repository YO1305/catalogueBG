import { servePublicMedia } from "@/lib/servePublicMedia";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  return servePublicMedia(token);
}
