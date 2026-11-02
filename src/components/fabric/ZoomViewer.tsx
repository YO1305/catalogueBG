"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { publicMediaSrc } from "@/lib/publicMedia";

export function ZoomViewer({
  src,
  alt,
  rapportCm,
  seamless,
  onZoomed,
  chrome = "full",
  maxZoom = 4,
}: {
  src: string;
  alt: string;
  rapportCm: number;
  seamless: boolean;
  onZoomed?: () => void;
  chrome?: "full" | "minimal";
  maxZoom?: number;
}) {
  const { t } = useI18n();
  const media = publicMediaSrc(src, 1200);
  const [zoom, setZoom] = useState(1);
  const [tile, setTile] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const onZoomedRef = useRef(onZoomed);
  onZoomedRef.current = onZoomed;
  const [ruler, setRuler] = useState(48);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => {
        const next = Math.min(maxZoom, Math.max(1, current * (event.deltaY < 0 ? 1.08 : 0.92)));
        if (next > 1.4) onZoomedRef.current?.();
        return Math.round(next * 100) / 100;
      });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [maxZoom]);

  useEffect(() => {
    const width = imageRef.current?.getBoundingClientRect().width ?? 240;
    if (seamless && rapportCm > 0) setRuler(Math.max(24, (width / zoom) * (10 / rapportCm) * (tile ? 1 / 3 : 1)));
  }, [zoom, tile, rapportCm, seamless, src]);

  function applyZoom(next: number) {
    const capped = Math.min(maxZoom, Math.max(1, next));
    const rounded = Math.round(capped * 100) / 100;
    if (rounded > 1.4) onZoomedRef.current?.();
    setZoom(rounded);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic and some mobile pointers still zoom without capture. */
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1, zoom };
    }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!pinch.current || pointers.current.size < 2) return;
    const [a, b] = [...pointers.current.values()];
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    applyZoom(pinch.current.zoom * (dist / pinch.current.dist));
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  return (
    <div
      ref={box}
      className="relative h-full overflow-hidden bg-[#ebe4d8]"
      style={{ touchAction: "none" }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      {tile ? (
        <div
          role="img"
          aria-label={alt}
          className="h-full w-full"
          style={{ backgroundImage: `url(${media})`, backgroundRepeat: "repeat", backgroundSize: `${100 / 3}%`, transform: `scale(${zoom})` }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imageRef} src={media} alt={alt} className="h-full w-full object-contain" style={{ transform: `scale(${zoom})` }} />
      )}
      {chrome === "full" ? (
        <>
          <div className="absolute bottom-3 left-3 flex h-7 items-center gap-2 rounded-full bg-paper/90 px-3 text-xs leading-none shadow-sm">
            <span className="inline-block h-px bg-ink" style={{ width: ruler }} />
            <span>{t("catalog.ruler")}</span>
          </div>
          <button type="button" className="absolute right-3 top-3 flex h-8 items-center rounded-full bg-paper/90 px-3 text-xs leading-none shadow-sm" onClick={() => setTile((value) => !value)}>
            {t("catalog.tile")}
          </button>
          <p className="absolute bottom-3 right-3 hidden text-[10px] text-ink/70 md:block">{t("catalog.zoomHint")}</p>
        </>
      ) : null}
    </div>
  );
}
