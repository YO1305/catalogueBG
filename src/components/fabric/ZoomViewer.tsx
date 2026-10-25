"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";

export function ZoomViewer({ src, alt, rapportCm, seamless, onZoomed }: { src: string; alt: string; rapportCm: number; seamless: boolean; onZoomed?: () => void }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [tile, setTile] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [ruler, setRuler] = useState(48);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => {
        const next = Math.min(4, Math.max(1, current * (event.deltaY < 0 ? 1.08 : 0.92)));
        if (next > 1.4) onZoomed?.();
        return Math.round(next * 100) / 100;
      });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoomed]);

  useEffect(() => {
    const width = imageRef.current?.getBoundingClientRect().width ?? 240;
    if (seamless && rapportCm > 0) setRuler(Math.max(24, (width / zoom) * (10 / rapportCm) * (tile ? 1 / 3 : 1)));
  }, [zoom, tile, rapportCm, seamless, src]);

  return (
    <div ref={box} className="relative h-full overflow-hidden bg-[#ebe4d8]">
      {tile ? (
        <div
          role="img"
          aria-label={alt}
          className="h-full w-full"
          style={{ backgroundImage: `url(${src})`, backgroundRepeat: "repeat", backgroundSize: `${100 / 3}%`, transform: `scale(${zoom})` }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imageRef} src={src} alt={alt} className="h-full w-full object-contain" style={{ transform: `scale(${zoom})` }} />
      )}
      <div className="absolute bottom-3 left-3 flex h-7 items-center gap-2 rounded-full bg-paper/90 px-3 text-xs leading-none shadow-sm">
        <span className="inline-block h-px bg-ink" style={{ width: ruler }} />
        <span>{t("catalog.ruler")}</span>
      </div>
      <button type="button" className="absolute right-3 top-3 flex h-8 items-center rounded-full bg-paper/90 px-3 text-xs leading-none shadow-sm" onClick={() => setTile((value) => !value)}>
        {t("catalog.tile")}
      </button>
      <p className="absolute bottom-3 right-3 hidden text-[10px] text-ink/70 md:block">{t("catalog.zoomHint")}</p>
    </div>
  );
}
