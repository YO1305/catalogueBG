import { servePublicMedia } from "@/lib/servePublicMedia";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return servePublicMedia(token);
}
