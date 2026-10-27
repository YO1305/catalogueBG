"use client";

import { ChevronLeft, ChevronRight, Heart, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FabricModalGallery } from "@/components/fabric/FabricModalGallery";
import { SpecsTable } from "@/components/fabric/SpecsTable";
import { useI18n } from "@/components/i18n/I18n";
import { VariantDots } from "@/components/flipbook/VariantDots";
import { catalogProductCoverMockup, modalFabricView } from "@/lib/catalog";
import { fabricKind } from "@/lib/fabricKind";
import { ToneSwitch } from "@/components/fabric/ToneSwitch";
import { WovenVariantSwitch } from "@/components/fabric/WovenVariantSwitch";
import { BASE_VARIANT, colorOptions, withVariant } from "@/lib/variants";
import type { Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

const ACTION = "flex h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm leading-none transition";
const STEP = "flex h-10 min-w-0 items-center gap-1.5 rounded-full border border-ink/15 bg-white/60 text-[11px] leading-tight transition hover:border-ink/35 disabled:pointer-events-none disabled:opacity-35";
const STEP_ICON = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/5";

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
  const fabricSrc = fabricView?.src ?? "";
  const productRaw = productMockup?.webUrl || productMockup?.url || "";
  const productSrc = productRaw && productRaw !== fabricSrc ? productRaw : "";
  const productLabel =
    productTypes.find((item) => item.id === productMockup?.productType)?.name[lang] ??
    productMockup?.productType ??
    t("admin.product");
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1915]/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={fabric.name[lang]}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(94vh,720px)] w-full max-w-[min(96vw,74rem)] flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl md:min-h-[min(88vh,560px)] md:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-0 min-w-0 flex-[1.45] flex-col gap-3 p-4 md:p-6">
          <FabricModalGallery
            fabricLabel={t("catalog.fabricMockupTab")}
            fabricSrc={fabricSrc}
            fabricSeamless={Boolean(fabricView?.seamless)}
            rapportCm={fabric.rapport.widthCm}
            productLabel={productLabel}
            productSrc={productSrc}
            onZoomed={onZoomed}
          />
          {options.length > 1 ? (
            <div className="shrink-0 pt-1">
              {base.toned ? (
                <ToneSwitch options={options} value={variant} onChange={setVariant} />
              ) : kind === "woven" && options.length <= 5 ? (
                <WovenVariantSwitch options={options} value={variant} onChange={setVariant} />
              ) : (
                <VariantDots options={options} value={variant} onChange={setVariant} size="2rem" />
              )}
            </div>
          ) : null}
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-ink/10 p-4 md:w-[18rem] md:border-l md:border-t-0 md:p-5 lg:w-[20rem]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-2xl leading-tight">{fabric.name[lang]}</h2>
              <p className="font-mono mt-1 text-xs text-ink/60">{fabric.art}</p>
            </div>
            <button type="button" className="shrink-0 rounded-full p-1 hover:bg-black/5" aria-label={t("common.close")} onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
          {base.toned ? <p className="text-[11px] leading-relaxed text-ink/60">{t("tone.pantone")}</p> : null}
          {typeName && typeName !== fabric.name[lang] ? <p className="text-xs text-ink/70">{typeName}</p> : null}
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
          <nav className="mt-auto grid grid-cols-2 gap-2 border-t border-ink/10 pt-3" aria-label={t("catalog.designNav")}>
            <button type="button" className={`${STEP} justify-start pl-1 pr-2`} disabled={!fabrics[index - 1]} onClick={() => fabrics[index - 1] && onPick(fabrics[index - 1].id)}>
              <span className={STEP_ICON}><ChevronLeft className="h-3.5 w-3.5" /></span>
              <span className="text-left">{t("catalog.prev")}</span>
            </button>
            <button type="button" className={`${STEP} justify-end pl-2 pr-1`} disabled={!fabrics[index + 1]} onClick={() => fabrics[index + 1] && onPick(fabrics[index + 1].id)}>
              <span className="text-right">{t("catalog.next")}</span>
              <span className={STEP_ICON}><ChevronRight className="h-3.5 w-3.5" /></span>
            </button>
          </nav>
        </aside>
      </div>
    </div>
  );
}
