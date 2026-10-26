import type { ZipTemplateManifest, ZipTemplateZone } from "@/lib/templateZip/types";

export type ZipTemplateManifestWire = Omit<ZipTemplateManifest, "zones"> & {
  zones: Array<
    Omit<ZipTemplateZone, "uvGrid"> & {
      uvGrid: Pick<ZipTemplateZone["uvGrid"], "x0" | "y0" | "step" | "cols" | "rows">;
    }
  >;
};

/** Manifest for POST /import-zip/complete — u/v arrays live only in template.json on Blob. */
export function manifestForWire(manifest: ZipTemplateManifest): ZipTemplateManifestWire {
  return {
    ...manifest,
    zones: manifest.zones.map((zone) => ({
      ...zone,
      uvGrid: {
        x0: zone.uvGrid.x0,
        y0: zone.uvGrid.y0,
        step: zone.uvGrid.step,
        cols: zone.uvGrid.cols,
        rows: zone.uvGrid.rows,
      },
    })),
  };
}
