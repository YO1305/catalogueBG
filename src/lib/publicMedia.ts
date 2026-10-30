/** Same-origin photo URL. Hex so the word “fabric” cannot appear in the path and get blocked. */
const REMOTE = /blob\.vercel-storage\.com|storage\.googleapis\.com/i;

export function isRemoteMediaUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && REMOTE.test(url);
}

export function publicMediaSrc(url: string, _width = 1200): string {
  if (!url || url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!isRemoteMediaUrl(url)) return url;
  const bytes = new TextEncoder().encode(url);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return `/api/m/${hex}`;
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
