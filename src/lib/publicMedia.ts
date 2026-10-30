/** Same-origin photo URL. XOR+hex so “fabric” and https:// cannot appear in the token. */
const REMOTE = /blob\.vercel-storage\.com|storage\.googleapis\.com/i;
const XOR = 0x5a;

export function isRemoteMediaUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && REMOTE.test(url);
}

export function encodeMediaToken(url: string): string {
  const bytes = new TextEncoder().encode(url);
  let hex = "";
  for (const byte of bytes) hex += (byte ^ XOR).toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(token: string, xor: number): string | null {
  if (!token || !/^[0-9a-f]+$/i.test(token) || token.length % 2) return null;
  try {
    const bytes = new Uint8Array(token.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(token.slice(i * 2, i * 2 + 2), 16) ^ xor;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function decodeMediaToken(token: string): string | null {
  const obfuscated = hexToBytes(token, XOR);
  if (obfuscated && isRemoteMediaUrl(obfuscated)) return obfuscated;
  const legacy = hexToBytes(token, 0);
  if (legacy && isRemoteMediaUrl(legacy)) return legacy;
  return null;
}

export function publicMediaSrc(url: string, _width = 1200): string {
  if (!url || url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!isRemoteMediaUrl(url)) return url;
  return `/api/p?t=${encodeMediaToken(url)}`;
}

export function isTemplatePlaceholder(url: string): boolean {
  return url.includes("/templates/");
}

export function renderedMockupSrc(mockup: { url?: string; webUrl?: string; thumbUrl?: string } | undefined): string {
  if (!mockup) return "";
  const src = mockup.webUrl || mockup.thumbUrl || mockup.url || "";
  if (!src || isTemplatePlaceholder(src)) return "";
  return src;
}
