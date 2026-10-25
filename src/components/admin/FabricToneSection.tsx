"use client";

import { ImagePlus } from "lucide-react";
import { useI18n } from "@/components/i18n/I18n";
import { Input } from "@/components/ui/field";
import { defaultWeave } from "@/lib/mockup/weave";
import { toneVariant } from "@/lib/variants";
import type { Fabric, FabricDesign, FabricVariant, FabricWeave, Mockup, Tone } from "@/types";

type Side = Exclude<Tone, "medium">;

export function FabricToneSection({
  fabric,
  progress,
  onUploadMain,
  onUploadTone,
  onPatchTone,
  onPatchWeave,
}: {
  fabric: Fabric;
  progress: number;
  onUploadMain: (file: File) => void;
  onUploadTone: (tone: Side, file: File) => void;
  onPatchTone: (tone: Side, partial: Partial<FabricVariant>) => void;
  onPatchWeave: (partial: Partial<FabricWeave>) => void;
}) {
  const { t } = useI18n();
  const slot = (tone: Tone) => {
    if (tone === "medium") return { design: fabric.design, mockups: fabric.mockups, color: fabric.weave?.color ?? defaultWeave().color };
    const variant = toneVariant(fabric, tone);
    return { design: variant?.design, mockups: variant?.mockups ?? [], color: variant?.weaveColor ?? fabric.weave?.color ?? defaultWeave().color };
  };
  return (
    <section className="rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("tone.title")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("tone.editorHint")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["light", "medium", "dark"] as const).map((tone) => {
          const { design, mockups, color } = slot(tone);
          return (
            <ToneCard
              key={tone}
              label={t(`tone.${tone}`)}
              design={design}
              mockups={mockups}
              color={color}
              busy={progress > 0 && progress < 1}
              uploadLabel={design?.webUrl ? t("tone.replace") : t("tone.upload")}
              missingLabel={t("tone.missing")}
              colorLabel={t("weave.color")}
              onUpload={(file) => (tone === "medium" ? onUploadMain(file) : onUploadTone(tone, file))}
              onColor={(value) => (tone === "medium" ? onPatchWeave({ color: value }) : onPatchTone(tone, { weaveColor: value }))}
            />
          );
        })}
      </div>
    </section>
  );
}

function ToneCard(props: {
  label: string;
  design?: FabricDesign;
  mockups: Mockup[];
  color?: string;
  busy: boolean;
  uploadLabel: string;
  missingLabel: string;
  colorLabel: string;
  onUpload: (file: File) => void;
  onColor: (value: string) => void;
}) {
  const photo = props.design?.thumbUrl || props.design?.webUrl;
  const ready = props.mockups.filter((item) => item.webUrl);
  return (
    <div className={`rounded-lg border p-3 ${photo ? "border-black/10" : "border-dashed border-amber-600/60"}`}>
      <p className="text-sm font-medium">
        {props.label} <span className="text-amber-700">*</span>
      </p>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="mt-2 aspect-square w-full rounded-md object-cover" />
      ) : (
        <div className="mt-2 flex aspect-square w-full items-center justify-center rounded-md bg-black/[0.03] px-2 text-center text-xs text-amber-700">{props.missingLabel}</div>
      )}
      <label className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-2 py-2 text-xs ${props.busy ? "pointer-events-none opacity-50" : "hover:border-black/25"}`}>
        <ImagePlus className="h-4 w-4" />
        {props.uploadLabel}
        <input
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/tiff,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) props.onUpload(file);
          }}
        />
      </label>
      {props.color ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-ink/60">
          <Input className="h-8 w-12 p-1" type="color" value={props.color} onChange={(event) => props.onColor(event.target.value)} aria-label={props.colorLabel} />
          <span className="font-mono">{props.color}</span>
        </div>
      ) : null}
      {ready.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {ready.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.templateId + item.productType} src={item.thumbUrl} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
