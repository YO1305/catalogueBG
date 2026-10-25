"use client";

import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SpecsTable } from "@/components/fabric/SpecsTable";
import { ZoomViewer } from "@/components/fabric/ZoomViewer";
import { useI18n } from "@/components/i18n/I18n";
import { VariantDots } from "@/components/flipbook/VariantDots";
import { visibleMockups } from "@/lib/catalog";
import { colorOptions, withVariant } from "@/lib/variants";
import type { Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

export function FabricModal({
  fabric: base,
  variantId,
  fabrics,
  catalog,
  fabricTypes,
  collections,
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
  const tabs = [
    { id: "design", label: t("catalog.designTab"), src: fabric.design.webUrl },
    ...mockups.map((mockup) => ({
      id: mockup.templateId + mockup.productType,
      label: productTypes.find((item) => item.id === mockup.productType)?.name[lang] ?? mockup.productType,
      src: mockup.url,
    })),
    ...fabric.realPhotos.map((photo, index) => ({ id: `photo-${index}`, label: t("catalog.photoTab"), src: photo.url })),
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
  const collectionName = collections.find((item) => item.id === fabric.collectionId)?.name[lang] ?? "";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1915]/70 p-0 md:p-6" role="dialog" aria-modal="true" aria-label={fabric.name[lang]}>
      <div className="flex h-full w-full flex-col bg-paper md:h-[90vh] md:w-[90vw] md:flex-row">
        <div className="relative min-h-[46%] flex-1 md:min-h-0">
          {current ? (
            <ZoomViewer src={current.src} alt={`${fabric.name[lang]} — ${current.label}`} rapportCm={fabric.rapport.widthCm} seamless={fabric.design.seamless && tab === 0} onZoomed={onZoomed} />
          ) : null}
          <div className="absolute bottom-12 left-0 right-0 flex gap-2 overflow-auto px-3">
            {tabs.map((item, itemIndex) => (
              <button key={item.id} type="button" className={`shrink-0 px-2 py-1 text-xs ${itemIndex === tab ? "bg-majolica text-paper" : "bg-paper/90"}`} onClick={() => setTab(itemIndex)}>
                {item.label}
              </button>
            ))}
          </div>
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
          <p>{typeName}</p>
          <p className="text-sm text-ink/60">{collectionName}</p>
          <SpecsTable fabric={fabric} catalog={catalog} />
          <button type="button" className="border border-ink/15 px-3 py-2 text-left text-sm" onClick={onToggleSave}>
            <Heart className={`mr-2 inline h-4 w-4 ${saved ? "fill-current" : ""}`} />
            {saved ? t("lead.remove") : t("lead.add")}
          </button>
          <button type="button" className="bg-majolica px-3 py-2 text-sm text-paper" onClick={onShare}>
            {t("catalog.shareDesign")}
          </button>
          <div className="mt-auto flex justify-between text-sm">
            <button type="button" disabled={!fabrics[index - 1]} onClick={() => fabrics[index - 1] && onPick(fabrics[index - 1].id)}>
              <ChevronLeft className="inline h-4 w-4" /> {t("catalog.prev")}
            </button>
            <button type="button" disabled={!fabrics[index + 1]} onClick={() => fabrics[index + 1] && onPick(fabrics[index + 1].id)}>
              {t("catalog.next")} <ChevronRight className="inline h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
