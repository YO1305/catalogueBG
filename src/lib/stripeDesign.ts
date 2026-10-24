export function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  if (clean.length >= 6) {
    return [parseInt(clean.slice(0, 2), 16) / 255, parseInt(clean.slice(2, 4), 16) / 255, parseInt(clean.slice(4, 6), 16) / 255];
  }
  return [0.9, 0.9, 0.9];
}

export function defaultStripeBands(): Array<{ widthCm: number; color: string; shiny: boolean }> {
  return [
    { widthCm: 1.5, color: "#163a66", shiny: true },
    { widthCm: 1.0, color: "#f4efe6", shiny: false },
    { widthCm: 1.5, color: "#163a66", shiny: true },
  ];
}

/** Horizontal stripe preview for design card (RGB png bytes via canvas in browser). */
export function stripePreviewSvg(bands: Array<{ widthCm: number; color: string; shiny: boolean }>, width = 400, height = 120): string {
  const period = bands.reduce((s, b) => s + b.widthCm, 0) || 1;
  let x = 0;
  const rects: string[] = [];
  while (x < width) {
    for (const band of bands) {
      const w = (band.widthCm / period) * width;
      const opacity = band.shiny ? 1 : 0.92;
      rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="${band.color}" opacity="${opacity}"/>`);
      x += w;
      if (x >= width) break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects.join("")}</svg>`;
}
