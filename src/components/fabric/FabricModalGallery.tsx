"use client";

import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { fabricModalScaleFactor } from "@/lib/fabricModalLayout";

function MediaTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-h-0 min-w-0 flex-col gap-1.5">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/10 bg-[#ebe4d8] shadow-sm">{children}</div>
      <figcaption className="truncate text-center text-[11px] font-medium text-ink/55">{label}</figcaption>
    </figure>
  );
}

export function FabricModalGallery({
  fabricLabel,
  fabricSrc,
  fabricSeamless,
  rapportCm,
  productLabel,
  productSrc,
  modalScale,
  onZoomed,
}: {
  fabricLabel: string;
  fabricSrc: string;
  fabricSeamless: boolean;
  rapportCm: number;
  productLabel: string;
  productSrc: string;
  modalScale?: number;
  onZoomed?: () => void;
}) {
  const two = Boolean(fabricSrc && productSrc);
  const factor = fabricModalScaleFactor({ fabricModalScale: modalScale });
  const singleMax = `${(26 * factor).toFixed(2)}rem`;
  return (
    <div
      className={`grid min-h-0 w-full flex-1 content-center gap-4 ${two ? "grid-cols-2" : "mx-auto grid-cols-1"}`}
      style={two ? undefined : { maxWidth: `min(100%, ${singleMax})` }}
    >
      {fabricSrc ? (
        <MediaTile label={fabricLabel}>
          <ZoomViewer src={fabricSrc} alt={fabricLabel} rapportCm={rapportCm} seamless={fabricSeamless} onZoomed={onZoomed} chrome="minimal" />
        </MediaTile>
      ) : null}
      {productSrc ? (
        <MediaTile label={productLabel}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productSrc} alt={productLabel} className="h-full w-full object-contain" />
        </MediaTile>
      ) : null}
    </div>
  );
}
