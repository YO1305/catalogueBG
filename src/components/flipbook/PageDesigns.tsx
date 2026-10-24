"use client";

import { CatalogImage, PageHeader } from "@/components/flipbook/PageHeader";
import { useI18n } from "@/components/i18n/I18n";
import { heroMockup } from "@/lib/catalog";
import type { Catalog, Fabric, FabricType } from "@/types";

export function PageDesigns({
  catalog,
  fabrics,
  fabricTypes,
  pageNumber,
  active,
  onOpen,
}: {
  catalog: Catalog;
  fabrics: Fabric[];
  fabricTypes: FabricType[];
  pageNumber: number;
  active: boolean;
  onOpen: (id: string) => void;
}) {
  const { lang, t } = useI18n();
  const rows = catalog.layout.perPage >= 3 ? "grid-cols-2" : "grid-cols-1";
  return (
    <div className="flex h-full flex-col text-[1em]">
      <PageHeader title={catalog.title[lang]} page={pageNumber} />
      <div className={`grid min-h-0 flex-1 ${rows}`} style={{ gridTemplateRows: catalog.layout.perPage <= 2 ? `repeat(${Math.max(fabrics.length, 1)}, minmax(0, 1fr))` : undefined }}>
        {fabrics.map((fabric, index) => {
          const mockup = heroMockup(fabric, catalog.showProductTypes);
          const typeName = fabricTypes.find((item) => item.id === fabric.fabricTypeId)?.name[lang] ?? "";
          const mirror = index % 2 === 1 && catalog.layout.perPage === 2;
          const image = (
            <button type="button" className="lift cursor-zoom relative min-h-0 overflow-hidden" onClick={() => onOpen(fabric.id)}>
              <CatalogImage
                src={mockup?.url || fabric.design.webUrl}
                thumbUrl={mockup?.thumbUrl}
                webUrl={mockup?.webUrl}
                fallbackSrc={fabric.design.webUrl || fabric.design.thumbUrl}
                alt={`${fabric.name[lang]} — ${typeName}`}
                active={active}
              />
            </button>
          );
          const copy = (
            <div className="flex min-w-0 flex-col justify-center gap-[0.35em] px-[0.8em]">
              <p className="pointer-events-none absolute text-[2.4em] uppercase tracking-wide opacity-[0.06]" style={{ fontFamily: "var(--font-display)" }}>
                {typeName}
              </p>
              <button type="button" className="text-left" onClick={() => onOpen(fabric.id)}>
                <span className="font-display block text-[1.35em] leading-tight">{fabric.name[lang]}</span>
                <span className="font-mono mt-[0.2em] block text-[0.75em]" style={{ color: "var(--muted)" }}>
                  {fabric.art}
                </span>
              </button>
              <p className="text-[0.78em]" style={{ color: "var(--muted)" }}>
                {typeName}
              </p>
              <p className="text-[0.78em]">
                {fabric.density} {t("common.gm2")} · {fabric.width} {t("common.cm")}
              </p>
              <div className="flex gap-1">
                {fabric.colors.slice(0, 5).map((color) => (
                  <span key={color} className="h-[0.7em] w-[0.7em] rounded-full border" style={{ background: color, borderColor: "var(--line)" }} />
                ))}
              </div>
              {fabric.isNew ? <span className="text-[0.72em] uppercase tracking-wider text-[#a6843d]">{t("catalog.newBadge")}</span> : null}
              {catalog.showPrices && fabric.priceVisible ? (
                <p className="font-mono text-[0.75em]">
                  {fabric.priceVisible.usd ? `$${fabric.priceVisible.usd}` : ""} {fabric.priceVisible.uzs ? `${fabric.priceVisible.uzs} UZS` : ""}
                </p>
              ) : null}
              <p className="text-[0.68em]" style={{ color: "var(--muted)" }}>
                {t("catalog.click")}
              </p>
            </div>
          );
          return (
            <div key={fabric.id} className="relative grid min-h-0 grid-cols-[1.4fr_0.9fr] gap-[0.4em] border-b px-[4%] py-[3%]" style={{ borderColor: "var(--line)" }}>
              {mirror ? copy : image}
              {mirror ? image : copy}
            </div>
          );
        })}
      </div>
    </div>
  );
}
