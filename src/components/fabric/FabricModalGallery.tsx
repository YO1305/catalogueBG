"use client";

import type { CSSProperties } from "react";
import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { fabricModalScaleFactor, fabricModalTileStyle } from "@/lib/fabricModalLayout";
import { publicMediaSrc } from "@/lib/publicMedia";

export type ModalTile = { src: string; label: string; seamless?: boolean };

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
  tiles,
  rapportCm,
  modalScale,
  onZoomed,
  maxZoom = 4,
}: {
  tiles: ModalTile[];
  rapportCm: number;
  modalScale?: number;
  onZoomed?: () => void;
  maxZoom?: number;
}) {
  const many = tiles.length > 1;
  const factor = fabricModalScaleFactor({ fabricModalScale: modalScale });
  const tileStyle = fabricModalTileStyle(factor, many);

  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div className={`grid w-full max-h-full gap-4 ${many ? "grid-cols-2" : "grid-cols-1 place-items-center"}`}>
        {tiles.map((tile, index) => (
          <MediaTile key={`${tile.src}-${index}`} label={tile.label} tileStyle={tileStyle}>
            {index === 0 ? (
              <ZoomViewer src={tile.src} alt={tile.label} rapportCm={rapportCm} seamless={Boolean(tile.seamless)} onZoomed={onZoomed} chrome="minimal" maxZoom={maxZoom} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicMediaSrc(tile.src)} alt={tile.label} className="h-full w-full object-contain" />
            )}
          </MediaTile>
        ))}
      </div>
    </div>
  );
}
