"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { Fabric, FabricVariant } from "@/types";

export function FabricVariantsSection({
  fabric,
  progress,
  onChange,
  onAdd,
  onPatch,
  onRemove,
}: {
  fabric: Fabric;
  progress: number;
  onChange: (partial: Partial<Fabric>) => void;
  onAdd: (file: File) => void;
  onPatch: (id: string, partial: Partial<FabricVariant>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const picker = useRef<HTMLInputElement>(null);
  const variants = fabric.variants ?? [];
  return (
    <section className="rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("designs.variants")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("designs.variantsHint")}</p>
      <div className="mt-4 space-y-3">
        <Row thumb={fabric.design.thumbUrl || fabric.design.webUrl} label={t("designs.baseColorName")}>
          <Input value={fabric.colorName ?? ""} placeholder={t("designs.colorNamePlaceholder")} onChange={(event) => onChange({ colorName: event.target.value })} />
        </Row>
        {variants.map((variant, index) => (
          <Row key={variant.id} thumb={variant.design.thumbUrl || variant.design.webUrl} label={t("designs.variantName", { n: index + 2 })} mockups={variant.mockups.filter((item) => item.webUrl).map((item) => item.thumbUrl)}>
            <div className="flex gap-2">
              <Input value={variant.name} placeholder={t("designs.colorNamePlaceholder")} onChange={(event) => onPatch(variant.id, { name: event.target.value })} />
              <Button type="button" variant="outline" size="icon" aria-label={t("designs.removeVariant")} onClick={() => onRemove(variant.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Row>
        ))}
      </div>
      <input
        ref={picker}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/tiff,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onAdd(file);
        }}
      />
      <Button type="button" variant="outline" className="mt-4" disabled={progress > 0 && progress < 1} onClick={() => picker.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        {progress > 0 && progress < 1 ? `${Math.round(progress * 100)}%` : t("designs.addVariant")}
      </Button>
    </section>
  );
}

function Row({ thumb, label, mockups, children }: { thumb: string; label: string; mockups?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-full border border-black/10 object-cover" />
      ) : (
        <span className="h-14 w-14 shrink-0 rounded-full bg-black/5" />
      )}
      <div className="min-w-0 flex-1">
        <Label>{label}</Label>
        {children}
        {mockups?.length ? (
          <div className="mt-2 flex gap-1.5">
            {mockups.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="h-12 w-12 rounded-md object-cover" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
