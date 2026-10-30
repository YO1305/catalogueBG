const hits = new Map<string, number[]>();

function recentHits(key: string, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  hits.set(key, recent);
  return recent;
}

export function peekRateLimit(key: string, limit = 5, windowMs = 60_000) {
  return recentHits(key, windowMs).length >= limit;
}

export function hitRateLimit(key: string, windowMs = 60_000) {
  const recent = recentHits(key, windowMs);
  recent.push(Date.now());
  hits.set(key, recent);
}

export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  if (peekRateLimit(key, limit, windowMs)) return false;
  hitRateLimit(key, windowMs);
  return true;
}
