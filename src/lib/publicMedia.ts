/** Same-origin photo URL so catalog images are not blocked as third-party / “fabric” ads. */
const REMOTE = /blob\.vercel-storage\.com|storage\.googleapis\.com/i;

export function isRemoteMediaUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && REMOTE.test(url);
}

export function publicMediaSrc(url: string, _width = 1200): string {
  if (!url || url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!isRemoteMediaUrl(url)) return url;
  const bytes = new TextEncoder().encode(url);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const token = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/api/m/${token}`;
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
