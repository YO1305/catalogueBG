function round(n: number) {
  return Math.round(n * 100) / 100;
}

function numbers(text: string): number[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((n) => Number.isFinite(n));
}

export function parseDensity(input: string): { min: number; max: number } | null {
  const text = input.trim().replace(/,/g, ".");
  if (!text) return null;
  const plusMinus = text.match(/(\d+(?:\.\d+)?)\s*(?:±|\+\/-|\+-)\s*(\d+(?:\.\d+)?)/);
  if (plusMinus) {
    const base = Number(plusMinus[1]);
    const delta = Number(plusMinus[2]);
    return { min: round(base - delta), max: round(base + delta) };
  }
  const range = text.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { min: round(Math.min(a, b)), max: round(Math.max(a, b)) };
  }
  const found = numbers(text);
  if (!found.length) return null;
  return { min: round(Math.min(...found)), max: round(Math.max(...found)) };
}

export function parseWidths(input: string): number[] {
  const text = input.trim().replace(/,/g, ".");
  if (!text) return [];
  return numbers(text).map(round);
}
