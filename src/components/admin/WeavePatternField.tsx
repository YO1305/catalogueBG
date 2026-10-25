"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { presetLabel, STRIPE_PRESETS } from "@/lib/mockup/weave";
import type { FabricWeave, WeavePattern } from "@/types";

const PATTERNS: Array<{ id: WeavePattern; key: string }> = [
  { id: "stripes", key: "weave.patternStripes" },
  { id: "map", key: "weave.patternMap" },
  { id: "none", key: "weave.patternNone" },
];

export function WeavePatternField({
  weave,
  onPatch,
  onUploadMap,
}: {
  weave: FabricWeave;
  onPatch: (partial: Partial<FabricWeave>) => void;
  onUploadMap: (file: File) => Promise<void>;
}) {
  const { t } = useI18n();
  const stripes = weave.stripes ?? [];
  const current = presetLabel(stripes);

  function setStripe(index: number, partial: Partial<{ widthCm: number; shiny: boolean }>) {
    onPatch({ stripes: stripes.map((item, i) => (i === index ? { ...item, ...partial } : item)) });
  }

  return (
    <fieldset>
      <legend className="text-xs uppercase tracking-wide text-ink/60">{t("weave.pattern")}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {PATTERNS.map((item) => (
          <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${weave.pattern === item.id ? "border-majolica bg-majolica text-paper" : "border-black/15 bg-white"}`}>
            <input type="radio" className="sr-only" name="weave-pattern" checked={weave.pattern === item.id} onChange={() => onPatch({ pattern: item.id })} />
            {t(item.key)}
          </label>
        ))}
      </div>
      {weave.pattern === "stripes" ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STRIPE_PRESETS.map((preset) => {
              const label = presetLabel(preset);
              return (
                <Button key={label} type="button" size="sm" variant={label === current ? "default" : "outline"} onClick={() => onPatch({ stripes: preset })}>
                  {`${label} ${t("common.cm")}`}
                </Button>
              );
            })}
          </div>
          <ul className="space-y-2">
            {stripes.map((stripe, index) => (
              <li key={index} className="flex flex-wrap items-center gap-3 text-sm">
                <Input className="w-20" type="number" min={0.1} step={0.05} value={stripe.widthCm} onChange={(event) => setStripe(index, { widthCm: Number(event.target.value) })} aria-label={t("weave.stripeWidth")} />
                <span className="text-xs text-ink/55">{t("common.cm")}</span>
                <Checkbox checked={stripe.shiny} label={t("weave.stripeShiny")} onCheckedChange={(shiny) => setStripe(index, { shiny })} />
                <Button type="button" size="sm" variant="outline" disabled={stripes.length < 2} onClick={() => onPatch({ stripes: stripes.filter((_, i) => i !== index) })}>
                  {t("common.delete")}
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={() => onPatch({ stripes: [...stripes, { widthCm: 1, shiny: !stripes[stripes.length - 1]?.shiny }] })}>
            {t("weave.addStripe")}
          </Button>
        </div>
      ) : null}
      {weave.pattern === "map" ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-ink/55">{t("weave.mapHint")}</p>
          <input className="block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp,image/tiff" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUploadMap(file); }} />
          {weave.mapUrl ? <img src={weave.mapUrl} alt="" className="h-24 w-24 rounded border border-black/10 object-cover" /> : null}
          <div className="max-w-[12rem]">
            <Label>{t("weave.mapWidth")}</Label>
            <Input type="number" min={0.5} step={0.5} value={weave.mapWidthCm ?? 10} onChange={(event) => onPatch({ mapWidthCm: Number(event.target.value) })} />
          </div>
        </div>
      ) : null}
      {weave.pattern === "none" ? <p className="mt-3 text-xs text-ink/55">{t("weave.noneHint")}</p> : null}
    </fieldset>
  );
}
