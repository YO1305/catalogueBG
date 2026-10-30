import QRCode from "qrcode";

function allowedQrText(text: string) {
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "bahmal.uz" || host.endsWith(".bahmal.uz") || host === "catalogue-bg.vercel.app" || host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get("text") ?? "";
  if (!allowedQrText(text)) return new Response("Bad request", { status: 400 });
  const png = await QRCode.toBuffer(text, { width: 512, margin: 1 });
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" } });
}
