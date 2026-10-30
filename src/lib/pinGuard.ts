import { cookieHeader } from "@/lib/session";
import { hitRateLimit, peekRateLimit } from "@/lib/rateLimit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 5;

function cookieName(slug: string) {
  return `bahmal_pin_try_${slug.replace(/[^a-z0-9_-]/gi, "")}`;
}

function memoryKey(ip: string, slug: string) {
  return `pin:${ip}:${slug}`;
}

export function pinTriesFromCookie(request: Request, slug: string) {
  const raw = request.headers.get("cookie") ?? "";
  const name = cookieName(slug);
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=(\\d+)`));
  return match ? Number(match[1]) : 0;
}

export function pinLocked(ip: string, slug: string, cookieTries: number) {
  if (cookieTries >= MAX_TRIES) return true;
  return peekRateLimit(memoryKey(ip, slug), MAX_TRIES, WINDOW_MS);
}

export function recordPinFailure(ip: string, slug: string) {
  hitRateLimit(memoryKey(ip, slug), WINDOW_MS);
}

export function pinTryCookie(slug: string, tries: number) {
  return cookieHeader(cookieName(slug), String(tries), 15 * 60);
}

export function pinClearCookie(slug: string) {
  return cookieHeader(cookieName(slug), "", 0);
}
