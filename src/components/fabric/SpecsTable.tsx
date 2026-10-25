"use client";

import { useI18n } from "@/components/i18n/I18n";
import { weaveSpec } from "@/lib/mockup/weave";
import type { Catalog, Fabric } from "@/types";

export function SpecsTable({ fabric, catalog }: { fabric: Fabric; catalog: Catalog }) {
  const { lang, t } = useI18n();
  const rows = [
    [t("catalog.composition"), fabric.composition[lang]],
    [t("catalog.density"), fabric.density && `${fabric.density} ${t("common.gm2")}`],
    [t("catalog.width"), fabric.width && `${fabric.width} ${t("common.cm")}`],
    [t("weave.patternSpec"), fabric.woven && fabric.weave ? weaveSpec(fabric.weave, t) : ""],
  ].filter(([, value]) => value);
  const weaveColor = fabric.woven ? fabric.weave?.color : undefined;
  return (
    <div className="space-y-3 text-sm">
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-ink/10 py-2">
            <dt className="text-ink/60">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
        {weaveColor ? (
          <div className="flex items-center justify-between gap-4 border-b border-ink/10 py-2">
            <dt className="text-ink/60">{t("weave.colorSpec")}</dt>
            <dd className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-ink/15" style={{ background: weaveColor }} aria-hidden />
              {fabric.colorName || weaveColor}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="leading-relaxed text-ink/80">{fabric.description[lang]}</p>
      {catalog.showPrices && fabric.priceVisible ? (
        <p className="font-mono text-sm">
          {fabric.priceVisible.usd ? `$${fabric.priceVisible.usd}` : ""} {fabric.priceVisible.uzs ? `${fabric.priceVisible.uzs} UZS` : ""}
        </p>
      ) : null}
    </div>
  );
}
