"use client";

import { ChevronLeft, ChevronRight, Heart, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaTiles, type MediaTab } from "@/components/fabric/MediaTiles";
import { SpecsTable } from "@/components/fabric/SpecsTable";
import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { useI18n } from "@/components/i18n/I18n";
import { VariantDots } from "@/components/flipbook/VariantDots";
import { visibleMockups } from "@/lib/catalog";
import { colorOptions, withVariant } from "@/lib/variants";
import type { Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

const ACTION = "flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm leading-none transition";
const STEP = "flex h-12 min-w-0 items-center gap-2 rounded-full border border-ink/15 bg-white/60 text-xs leading-tight transition hover:border-ink/35 disabled:pointer-events-none disabled:opacity-35";
const STEP_ICON = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5";

export function FabricModal({
  fabric: base,
  variantId,
  fabrics,
  catalog,
  fabricTypes,
  productTypes,
  saved,
  onClose,
  onPick,
  onToggleSave,
  onZoomed,
  onShare,
}: {
  fabric: Fabric;
  variantId?: string;
  fabrics: Fabric[];
  catalog: Catalog;
  fabricTypes: FabricType[];
  collections: Collection[];
  productTypes: ProductType[];
  saved: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  onToggleSave: () => void;
  onZoomed: () => void;
  onShare: () => void;
}) {
  const { lang, t } = useI18n();
  const options = colorOptions(base);
  const [variant, setVariant] = useState(variantId ?? options[0]?.id);
  useEffect(() => setVariant(variantId ?? colorOptions(base)[0]?.id), [base, variantId]);
  const fabric = withVariant(base, variant);
  const mockups = visibleMockups(fabric, catalog.showProductTypes);
  const tabs: MediaTab[] = [
    { id: "design", label: t("catalog.designTab"), src: fabric.design.webUrl, thumb: fabric.design.thumbUrl },
    ...mockups.map((mockup) => ({
      id: mockup.templateId + mockup.productType,
      label: productTypes.find((item) => item.id === mockup.productType)?.name[lang] ?? mockup.productType,
      src: mockup.url,
      thumb: mockup.thumbUrl,
    })),
    ...fabric.realPhotos.map((photo, index) => ({ id: `photo-${index}`, label: t("catalog.photoTab"), src: photo.url, thumb: photo.thumbUrl })),
  ];
  const [tab, setTab] = useState(0);
  const index = fabrics.findIndex((item) => item.id === fabric.id);
  const current = tabs[tab] ?? tabs[0];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && fabrics[index - 1]) onPick(fabrics[index - 1]!.id);
      if (event.key === "ArrowRight" && fabrics[index + 1]) onPick(fabrics[index + 1]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fabrics, index, onClose, onPick]);
  useEffect(() => setTab(0), [fabric.id, variant]);
  const typeName = fabricTypes.find((item) => item.id === fabric.fabricTypeId)?.name[lang] ?? "";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1915]/70 p-0 md:p-6" role="dialog" aria-modal="true" aria-label={fabric.name[lang]}>
      <div className="flex h-full w-full flex-col bg-paper md:h-[90vh] md:w-[90vw] md:flex-row">
        <div className="flex min-h-[52%] flex-1 flex-col md:min-h-0">
          <div className="relative min-h-0 flex-1">
            {current ? (
              <ZoomViewer src={current.src} alt={`${fabric.name[lang]} — ${current.label}`} rapportCm={fabric.rapport.widthCm} seamless={fabric.design.seamless && tab === 0} onZoomed={onZoomed} />
            ) : null}
          </div>
          <MediaTiles tabs={tabs} value={tab} onChange={setTab} />
        </div>
        <aside className="flex w-full flex-col gap-4 overflow-auto p-5 md:w-[22rem]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl leading-none">{fabric.name[lang]}</h2>
              <p className="font-mono mt-2 text-sm text-ink/60">{fabric.art}</p>
            </div>
            <button type="button" aria-label={t("common.close")} onClick={onClose}>
              <X />
            </button>
          </div>
          {options.length ? <VariantDots options={options} value={variant} onChange={setVariant} size="2rem" /> : null}
          {typeName && typeName !== fabric.name[lang] ? <p className="text-sm text-ink/70">{typeName}</p> : null}
          <SpecsTable fabric={fabric} catalog={catalog} />
          <div className="grid gap-2">
            <button type="button" className={`${ACTION} border border-ink/15 bg-white/60 hover:border-ink/35`} onClick={onToggleSave}>
              <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              {saved ? t("lead.remove") : t("lead.add")}
            </button>
            <button type="button" className={`${ACTION} bg-majolica text-paper hover:opacity-90`} onClick={onShare}>
              <Share2 className="h-4 w-4" />
              {t("catalog.shareDesign")}
            </button>
          </div>
          <nav className="mt-auto grid grid-cols-2 gap-2 border-t border-ink/10 pt-4" aria-label={t("catalog.designNav")}>
            <button type="button" className={`${STEP} justify-start pl-1.5 pr-3`} disabled={!fabrics[index - 1]} onClick={() => fabrics[index - 1] && onPick(fabrics[index - 1].id)}>
              <span className={STEP_ICON}><ChevronLeft className="h-4 w-4" /></span>
              <span className="text-left">{t("catalog.prev")}</span>
            </button>
            <button type="button" className={`${STEP} justify-end pl-3 pr-1.5`} disabled={!fabrics[index + 1]} onClick={() => fabrics[index + 1] && onPick(fabrics[index + 1].id)}>
              <span className="text-right">{t("catalog.next")}</span>
              <span className={STEP_ICON}><ChevronRight className="h-4 w-4" /></span>
            </button>
          </nav>
        </aside>
      </div>
    </div>
  );
}
