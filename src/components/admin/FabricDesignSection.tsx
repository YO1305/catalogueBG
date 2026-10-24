"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Checkbox, Input, Label } from "@/components/ui/field";
import type { Fabric } from "@/types";

export function FabricDesignSection({
  fabric,
  progress,
  onChange,
  onUpload,
}: {
  fabric: Fabric;
  progress: number;
  onChange: (partial: Partial<Fabric>) => void;
  onUpload: (file: File) => void;
}) {
  const { t } = useI18n();
  return (
    <section
      className="rounded-sm border border-black/10 bg-white/80 p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
    >
      <h2 className="font-display text-lg">{t("wizard.design")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("wizard.dropHint")}</p>
      <input className="mt-3 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/tiff,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
      {progress > 0 && progress < 1 ? <p className="mt-2 text-sm">{Math.round(progress * 100)}%</p> : null}
      {fabric.design.webUrl ? (
        <img src={fabric.design.thumbUrl || fabric.design.webUrl} alt="" className="mt-4 aspect-square max-h-52 w-full max-w-xs object-cover" />
      ) : (
        <p className="mt-4 text-sm text-ink/45">{t("designs.noImage")}</p>
      )}
      {fabric.design.widthPx ? <p className="mt-2 font-mono text-xs text-ink/55">{fabric.design.widthPx} × {fabric.design.heightPx} px</p> : null}
      <div className="mt-4">
        <Checkbox checked={fabric.design.seamless} onCheckedChange={(seamless) => onChange({ design: { ...fabric.design, seamless } })} label={t("wizard.seamless")} />
        <p className="mt-1 text-xs text-ink/50">{t("designs.seamlessHint")}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>{t("designs.rapportShort")}</Label>
          <Input type="number" min={0} step={0.1} value={fabric.rapport.widthCm || ""} onChange={(event) => onChange({ rapport: { ...fabric.rapport, widthCm: Number(event.target.value) } })} />
        </div>
        <div>
          <Label>{t("designs.rapportLong")}</Label>
          <Input type="number" min={0} step={0.1} value={fabric.rapport.heightCm || ""} onChange={(event) => onChange({ rapport: { ...fabric.rapport, heightCm: Number(event.target.value) } })} />
        </div>
      </div>
      {fabric.colors.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {fabric.colors.map((color) => (
            <span key={color} className="h-7 w-7 rounded-full border border-black/10" style={{ background: color }} title={color} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
