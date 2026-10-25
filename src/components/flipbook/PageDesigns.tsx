"use client";

import { useState } from "react";
import { CatalogImage, PageHeader } from "@/components/flipbook/PageHeader";
import { PageFooter } from "@/components/flipbook/PageFooter";
import { VariantDots } from "@/components/flipbook/VariantDots";
import { useI18n } from "@/components/i18n/I18n";
import { designsPerPage, heroMockup } from "@/lib/catalog";
import { BASE_VARIANT, colorOptions, withVariant } from "@/lib/variants";
import type { Catalog, Fabric, FabricType } from "@/types";

type OpenFabric = (id: string, variantId?: string) => void;

export function PageDesigns({
  catalog,
  fabrics,
  fabricTypes,
  pageNumber,
  active,
  onOpen,
  onRequest,
}: {
  catalog: Catalog;
  fabrics: Fabric[];
  fabricTypes: FabricType[];
  pageNumber: number;
  active: boolean;
  onOpen: OpenFabric;
  onRequest: (id: string) => void;
}) {
  const { lang } = useI18n();
  return (
    <div className="flex h-full flex-col text-[1em]">
      <PageHeader title={catalog.title[lang]} page={pageNumber} />
      <div className="grid min-h-0 flex-1 gap-[0.9em] px-[6%] py-[4%]" style={{ gridTemplateRows: `repeat(${designsPerPage(catalog)}, minmax(0, 1fr))` }}>
        {fabrics.map((fabric) => (
          <DesignRow key={fabric.id} catalog={catalog} fabric={fabric} fabricTypes={fabricTypes} active={active} onOpen={onOpen} onRequest={onRequest} />
        ))}
      </div>
      <PageFooter catalog={catalog} />
    </div>
  );
}

function DesignRow({
  catalog,
  fabric,
  fabricTypes,
  active,
  onOpen,
  onRequest,
}: {
  catalog: Catalog;
  fabric: Fabric;
  fabricTypes: FabricType[];
  active: boolean;
  onOpen: OpenFabric;
  onRequest: (id: string) => void;
}) {
  const { lang, t } = useI18n();
  const options = colorOptions(fabric);
  const [variantId, setVariantId] = useState(options.length ? BASE_VARIANT : undefined);
  const shown = withVariant(fabric, variantId);
  const mockup = heroMockup(shown, catalog.showProductTypes);
  const typeName = fabricTypes.find((item) => item.id === fabric.fabricTypeId)?.name[lang] ?? "";
  const specs = [typeName, fabric.density && `${fabric.density} ${t("common.gm2")}`, fabric.width && `${fabric.width} ${t("common.cm")}`].filter(Boolean).join(" · ");
  return (
    <div className="grid min-h-0 grid-cols-[1.1fr_1fr] items-stretch gap-[0.9em]">
      <button
        type="button"
        className="lift cursor-zoom relative min-h-0 overflow-hidden rounded-[0.7em] bg-black/5"
        aria-label={`${fabric.name[lang]} — ${t("catalog.click")}`}
        onClick={() => onOpen(fabric.id, variantId)}
      >
        <CatalogImage
          src={mockup?.url || shown.design.webUrl}
          thumbUrl={mockup?.thumbUrl}
          webUrl={mockup?.webUrl}
          fallbackSrc={shown.design.webUrl || shown.design.thumbUrl}
          alt={`${fabric.name[lang]} — ${typeName}`}
          active={active}
        />
      </button>
      <div className="flex min-w-0 flex-col justify-center gap-[0.35em]">
        <button type="button" className="min-w-0 text-left" onClick={() => onOpen(fabric.id, variantId)}>
          <span className="font-display line-clamp-2 block text-[1.2em] leading-tight">{fabric.name[lang]}</span>
          <span className="font-mono mt-[0.15em] block text-[0.68em]" style={{ color: "var(--muted)" }}>{fabric.art}</span>
        </button>
        {specs ? <p className="line-clamp-2 text-[0.72em] leading-snug" style={{ color: "var(--muted)" }}>{specs}</p> : null}
        {options.length ? <VariantDots options={options} value={variantId} onChange={setVariantId} /> : null}
        {fabric.isNew ? <span className="text-[0.66em] uppercase tracking-wider text-[#a6843d]">{t("catalog.newBadge")}</span> : null}
        {catalog.showPrices && fabric.priceVisible ? (
          <p className="font-mono text-[0.72em]">
            {fabric.priceVisible.usd ? `$${fabric.priceVisible.usd}` : ""} {fabric.priceVisible.uzs ? `${fabric.priceVisible.uzs} UZS` : ""}
          </p>
        ) : null}
        <button type="button" className="mt-[0.3em] self-start rounded-full bg-majolica px-[1em] py-[0.45em] text-[0.68em] leading-none text-paper" onClick={() => onRequest(fabric.id)}>
          {t("catalog.sample")}
        </button>
      </div>
    </div>
  );
}
