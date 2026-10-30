const BOT_UA =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|facebookexternalhit|twitterbot|telegrambot|whatsapp|linkedinbot|discordbot|slackbot|googlebot|bingbot|yandex|baidu|semrush|ahrefs|bytespider|gptbot|claudebot|applebot|vercel-screenshot|embed/i;

export function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview";
}

export function isBotRequest(request: Request): boolean {
  if (isPreviewDeployment()) return true;
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return true;
  const purpose = `${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""} ${request.headers.get("x-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  if (request.headers.get("x-middleware-prefetch") === "1") return true;
  return false;
}
