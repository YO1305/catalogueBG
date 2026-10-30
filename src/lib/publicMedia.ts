/** Same-origin `/_next/image` so catalog photos load when the blob host is blocked. */
const REMOTE = /blob\.vercel-storage\.com|storage\.googleapis\.com/i;
const WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048];

function nearestWidth(width: number): number {
  return WIDTHS.reduce((best, item) => (Math.abs(item - width) < Math.abs(best - width) ? item : best), WIDTHS[0]);
}

export function publicMediaSrc(url: string, width = 1200): string {
  if (!url || url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!REMOTE.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${nearestWidth(width)}&q=80`;
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
