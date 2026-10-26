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
  light?: string;
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
  shadeKnee?: number;
  highlightRolloff?: boolean;
  weaveCapable?: boolean;
  softMasks?: boolean;
  referenceColor?: string;
  shadeScale?: number;
  product?: string;
  fabricView?: string;
  texture?: string;
  zones: ZipTemplateZone[];
};

export type ParsedTemplateZip = {
  jsonPath: string;
  manifest: ZipTemplateManifest;
  /** paths inside ZIP (forward slashes) */
  assetPaths: string[];
};
