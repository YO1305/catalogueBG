"use client";

import type { CSSProperties } from "react";
import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { fabricModalScaleFactor, fabricModalTileStyle } from "@/lib/fabricModalLayout";
import { publicMediaSrc } from "@/lib/publicMedia";

function MediaTile({ label, tileStyle, children }: { label: string; tileStyle: CSSProperties; children: React.ReactNode }) {
  return (
    <figure className="mx-auto flex min-h-0 min-w-0 flex-col gap-1.5" style={tileStyle}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/10 bg-[#ebe4d8] shadow-sm">
        {children}
      </div>
      <figcaption className="shrink-0 truncate text-center text-[11px] font-medium text-ink/55">{label}</figcaption>
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
  const tileStyle = fabricModalTileStyle(factor, two);

  return (
    <div className={`flex min-h-0 w-full flex-1 items-center justify-center ${two ? "px-0" : ""}`}>
      <div className={`grid w-full max-h-full gap-4 ${two ? "grid-cols-2" : "grid-cols-1 place-items-center"}`}>
        {fabricSrc ? (
          <MediaTile label={fabricLabel} tileStyle={tileStyle}>
            <ZoomViewer src={fabricSrc} alt={fabricLabel} rapportCm={rapportCm} seamless={fabricSeamless} onZoomed={onZoomed} chrome="minimal" />
          </MediaTile>
        ) : null}
        {productSrc ? (
          <MediaTile label={productLabel} tileStyle={tileStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicMediaSrc(productSrc, 1200)} alt={productLabel} className="h-full w-full object-contain" />
          </MediaTile>
        ) : null}
      </div>
    </div>
  );
}
