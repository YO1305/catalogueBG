"use client";

import { Pipette } from "lucide-react";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import type { WeaveControls } from "@/components/admin/FabricDesignSection";
import { WeavePatternField } from "@/components/admin/WeavePatternField";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { fabricColorAt } from "@/lib/mockup/fabricColor";
import { CORRECTION_MAX, CORRECTION_MIN, defaultWeave, scaleHex } from "@/lib/mockup/weave";
import type { Fabric } from "@/types";

export function FabricWeaveSection({ fabric, controls }: { fabric: Fabric; controls: WeaveControls }) {
  const { t } = useI18n();
  const weave = fabric.weave ?? defaultWeave();
  const photo = fabric.design.webUrl;

  async function pick(event: MouseEvent<HTMLImageElement>) {
    if (!photo) return;
    const box = event.currentTarget.getBoundingClientRect();
    const fx = (event.clientX - box.left) / box.width;
    const fy = (event.clientY - box.top) / box.height;
    try {
      controls.patchWeave({ color: await fabricColorAt(photo, fx, fy, weave.correction) });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    }
  }

  function setCorrection(next: number) {
    controls.patchWeave({ correction: next, color: scaleHex(weave.color, next / (weave.correction || 1)) });
  }

  return (
    <div className="mt-4 space-y-4">
      {photo ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- eyedropper reads click position on the uploaded photo */}
          <img src={photo} alt="" className="block h-auto max-h-72 w-auto max-w-full cursor-crosshair rounded" onClick={(event) => void pick(event)} />
          <figcaption className="mt-1 flex items-center gap-1 text-xs text-ink/55">
            <Pipette className="h-3.5 w-3.5" aria-hidden /> {t("weave.pickHint")}
          </figcaption>
        </figure>
      ) : (
        <p className="text-sm text-ink/45">{t("designs.noImage")}</p>
      )}
      <div>
        <Label>{t("weave.color")}</Label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="h-10 w-16 rounded border border-black/10" style={{ background: weave.color }} aria-hidden />
          <Input className="h-10 w-16 p-1" type="color" value={weave.color} onChange={(event) => controls.patchWeave({ color: event.target.value })} aria-label={t("weave.colorManual")} />
          <span className="font-mono text-xs text-ink/60">{weave.color}</span>
          <Button type="button" size="sm" variant="outline" disabled={!photo} onClick={() => void controls.autoColor()}>
            {t("weave.colorAuto")}
          </Button>
        </div>
      </div>
      <div>
        <Label>{t("weave.lightness")}</Label>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span>{t("weave.darker")}</span>
          <input className="flex-1" type="range" min={CORRECTION_MIN} max={CORRECTION_MAX} step={0.01} value={weave.correction} onChange={(event) => setCorrection(Number(event.target.value))} />
          <span>{t("weave.lighter")}</span>
          <span className="w-10 text-right font-mono">{weave.correction.toFixed(2)}</span>
        </div>
      </div>
      <WeavePatternField weave={weave} onPatch={controls.patchWeave} onUploadMap={controls.uploadMap} />
    </div>
  );
}
