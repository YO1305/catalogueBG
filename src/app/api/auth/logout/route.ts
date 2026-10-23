import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0` },
  });
}
