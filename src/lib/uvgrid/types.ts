import type { ZipTemplateManifest, ZipTemplateZone } from "@/lib/templateZip/types";

export type StripeBand = {
  widthCm: number;
  color: [number, number, number];
  shiny: boolean;
};

export type UvgridFabricInput =
  | {
      mode: "pattern";
      rgba: Uint8ClampedArray;
      widthPx: number;
      heightPx: number;
      rapportWidthCm: number;
      rapportHeightCm: number;
    }
  | {
      mode: "stripes";
      stripes: StripeBand[];
    };

export type UvgridAreaSetting = {
  areaId: string;
  scale: number;
  /** Сдвиг du, см (SPEC 5.7.4) */
  offsetX: number;
  /** Сдвиг dv, см */
  offsetY: number;
  rotation: number;
};

export type UvgridZoneAssets = {
  zone: ZipTemplateZone;
  mask: Uint8ClampedArray;
  shade: Uint8ClampedArray;
  weave?: Uint8ClampedArray;
  gloss?: Uint8ClampedArray;
};

export type UvgridRenderInput = {
  manifest: ZipTemplateManifest;
  background: Uint8ClampedArray;
  width: number;
  height: number;
  zones: UvgridZoneAssets[];
  fabric: UvgridFabricInput;
  settings: UvgridAreaSetting[];
  sameForAllAreas: boolean;
  weaveContrast?: number;
};

export type { ZipTemplateManifest };
