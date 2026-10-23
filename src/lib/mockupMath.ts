export function clampScale(value: number) {
  if (!Number.isFinite(value)) return 1;
  const stepped = Math.round(value * 20) / 20;
  return Math.min(10, Math.max(0.1, stepped));
}

export function scaleToSlider(scale: number) {
  const min = Math.log(0.1);
  const max = Math.log(10);
  return (Math.log(clampScale(scale)) - min) / (max - min);
}

export function sliderToScale(position: number) {
  const min = Math.log(0.1);
  const max = Math.log(10);
  const t = Math.min(1, Math.max(0, position));
  return clampScale(Math.exp(min + t * (max - min)));
}

export function tileSizePx(
  rapport: { widthCm: number; heightCm: number } | null,
  pxPerCm: number,
  soWidthPx: number,
  scale: number,
) {
  if (rapport && rapport.widthCm > 0 && rapport.heightCm > 0 && pxPerCm > 0) {
    return {
      w: rapport.widthCm * pxPerCm * scale,
      h: rapport.heightCm * pxPerCm * scale,
    };
  }
  const w = (soWidthPx / 4) * scale;
  return { w, h: w };
}

export const SCALE_PRESETS = [0.5, 1, 2, 5, 10] as const;
export const ROTATION_PRESETS = [0, 45, 90] as const;
