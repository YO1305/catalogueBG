"use client";

import { ChevronLeft, ChevronRight, Heart, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SpecsTable } from "@/components/fabric/SpecsTable";
import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { useI18n } from "@/components/i18n/I18n";
import { VariantDots } from "@/components/flipbook/VariantDots";
import { catalogProductCoverMockup, modalFabricView } from "@/lib/catalog";
import { fabricKind } from "@/lib/fabricKind";
import { ToneSwitch } from "@/components/fabric/ToneSwitch";
import { BASE_VARIANT, colorOptions, withVariant } from "@/lib/variants";
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
  const [variant, setVariant] = useState(variantId ?? BASE_VARIANT);
  useEffect(() => setVariant(variantId ?? BASE_VARIANT), [base, variantId]);
  const fabric = withVariant(base, variant);
  const kind = fabricKind(fabric);
  const showFlat = catalog.showFlatDesign || kind === "printed";
  const fabricView = modalFabricView(fabric, showFlat);
  const productMockup = catalogProductCoverMockup(fabric, catalog.showProductTypes);
  const mainSrc = fabricView?.src || productMockup?.url || productMockup?.webUrl || "";
  const productLabel =
    productMockup &&
    (productTypes.find((item) => item.id === productMockup.productType)?.name[lang] ?? productMockup.productType);
  const index = fabrics.findIndex((item) => item.id === fabric.id);
  const typeName = fabricTypes.find((item) => item.id === fabric.fabricTypeId)?.name[lang] ?? "";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && fabrics[index - 1]) onPick(fabrics[index - 1]!.id);
      if (event.key === "ArrowRight" && fabrics[index + 1]) onPick(fabrics[index + 1]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fabrics, index, onClose, onPick]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1915]/70 p-0 md:p-6" role="dialog" aria-modal="true" aria-label={fabric.name[lang]}>
      <div className="flex h-full w-full flex-col bg-paper md:h-[90vh] md:w-[90vw] md:flex-row">
        <div className="flex min-h-[52%] flex-1 flex-col md:min-h-0">
          <div className="relative min-h-0 flex-1">
            {mainSrc ? (
              <ZoomViewer
                src={mainSrc}
                alt={`${fabric.name[lang]} — ${t("catalog.fabricMockupTab")}`}
                rapportCm={fabric.rapport.widthCm}
                seamless={Boolean(fabricView?.seamless)}
                onZoomed={onZoomed}
              />
            ) : null}
            {fabricView && productMockup && (productMockup.url || productMockup.webUrl) ? (
              <div className="pointer-events-none absolute bottom-4 right-4 w-[min(32%,9rem)] overflow-hidden rounded-lg border border-white/80 bg-white/90 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productMockup.thumbUrl || productMockup.webUrl || productMockup.url}
                  alt={productLabel ? `${fabric.name[lang]} — ${productLabel}` : fabric.name[lang]}
                  className="aspect-[4/3] w-full object-cover"
                />
                {productLabel ? <p className="truncate px-2 py-1 text-[10px] font-medium text-ink/70">{productLabel}</p> : null}
              </div>
            ) : null}
          </div>
          {options.length > 1 ? (
            <div className="shrink-0 border-t border-ink/10 px-3 py-3">
              <div className="mx-auto flex max-w-md justify-center">
                {base.toned ? (
                  <ToneSwitch options={options} value={variant} onChange={setVariant} />
                ) : (
                  <VariantDots options={options} value={variant} onChange={setVariant} size="2.25rem" />
                )}
              </div>
            </div>
          ) : null}
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
          {base.toned ? <p className="text-xs leading-relaxed text-ink/60">{t("tone.pantone")}</p> : null}
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
