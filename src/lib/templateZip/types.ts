export type ZipUvGrid = {
  x0: number;
  y0: number;
  step: number;
  cols: number;
  rows: number;
  u: number[];
  v: number[];
};

export type ZipTemplateZone = {
  id: string;
  label: string;
  mask: string;
  shade: string;
  weave?: string;
  gloss?: string;
  pxPerCm: number;
  uvGrid: ZipUvGrid;
};

export type ZipTemplateManifest = {
  name: string;
  finish?: "sateen" | "matte" | string;
  size: [number, number];
  units?: string;
  tint_bgr?: [number, number, number];
  stripe?: { axis: string; photoPeriodCm: number };
  zones: ZipTemplateZone[];
};

export type ParsedTemplateZip = {
  jsonPath: string;
  manifest: ZipTemplateManifest;
  /** paths inside ZIP (forward slashes) */
  assetPaths: string[];
};
