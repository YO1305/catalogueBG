"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { defaultStripeBands, stripePreviewSvg } from "@/lib/stripeDesign";
import type { Fabric } from "@/types";

export function StripeConstructor({ fabric, onChange }: { fabric: Fabric; onChange: (partial: Partial<Fabric>) => void }) {
  const { t } = useI18n();
  const bands = fabric.stripes?.length ? fabric.stripes : defaultStripeBands();
  const preview = useMemo(() => {
    const svg = stripePreviewSvg(bands);
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [bands]);

  function setBands(next: Fabric["stripes"]) {
    onChange({
      designMode: "stripes",
      stripes: next,
      design: {
        ...fabric.design,
        webUrl: preview,
        thumbUrl: preview,
        originalUrl: preview,
        widthPx: 400,
        heightPx: 120,
        seamless: true,
      },
    });
  }

  function updateBand(index: number, partial: Partial<NonNullable<Fabric["stripes"]>[number]>) {
    const next = bands.map((band, i) => (i === index ? { ...band, ...partial } : band));
    setBands(next);
  }

  return (
    <section className="mt-4 rounded border border-black/10 bg-black/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("wizard.stripeBuilder")}</h3>
        <Checkbox
          checked={fabric.designMode === "stripes"}
          label={t("wizard.useStripeBuilder")}
          onCheckedChange={(checked) => {
            if (checked) setBands(bands);
            else onChange({ designMode: "upload" });
          }}
        />
      </div>
      {fabric.designMode === "stripes" ? (
        <>
          <img src={preview} alt="" className="mt-3 h-24 w-full max-w-md rounded border border-black/10 object-cover" />
          <ul className="mt-3 space-y-2">
            {bands.map((band, index) => (
              <li key={index} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2 text-sm">
                <Input type="color" value={band.color} onChange={(event) => updateBand(index, { color: event.target.value })} aria-label={t("wizard.stripeColor")} />
                <div>
                  <Label className="text-[0.65rem]">{t("wizard.stripeWidth")}</Label>
                  <Input type="number" min={0.1} step={0.1} value={band.widthCm} onChange={(event) => updateBand(index, { widthCm: Number(event.target.value) })} />
                </div>
                <Checkbox checked={band.shiny} label={t("wizard.stripeShiny")} onCheckedChange={(shiny) => updateBand(index, { shiny })} />
                <Button type="button" size="sm" variant="outline" onClick={() => setBands(bands.filter((_, i) => i !== index))}>
                  {t("common.delete")}
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" className="mt-2" variant="outline" onClick={() => setBands([...bands, { widthCm: 1, color: "#163a66", shiny: false }])}>
            {t("wizard.stripeAdd")}
          </Button>
        </>
      ) : null}
    </section>
  );
}
