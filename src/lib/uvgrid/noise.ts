/** Deterministic pseudo-noise for repeatable renders (parity tests). */
export function grainFactor(x: number, y: number, amplitude: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const n = s - Math.floor(s);
  return 1 + (n * 2 - 1) * amplitude;
}
