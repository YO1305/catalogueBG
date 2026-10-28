"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { uploadPublicBlob } from "@/lib/blob/clientUpload";
import { catalogCoverArtDimensionsText, validateCatalogCoverDimensions } from "@/lib/catalogCoverArt";

function extForFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  return "jpg";
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

export function CatalogCoverUpload({
  slug,
  imageUrl,
  disabled,
  onChange,
}: {
  slug: string;
  imageUrl?: string;
  disabled?: boolean;
  onChange: (cover: { imageUrl?: string }) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const spec = catalogCoverArtDimensionsText();

  async function onPick(file: File) {
    if (!slug.trim()) {
      toast(t("catalogs.coverUploadNeedSlug"));
      return;
    }
    setBusy(true);
    try {
      const { width, height } = await readImageSize(file);
      const check = validateCatalogCoverDimensions(width, height);
      if (!check.ok) {
        if (check.reason === "ratio") toast(t("catalogs.coverUploadBadRatio", { spec }));
        else toast(t("catalogs.coverUploadTooSmall", { spec }));
        return;
      }
      const pathname = `catalogs/${slug}/cover.${extForFile(file)}`;
      const url = await uploadPublicBlob(pathname, file, {
        onUploadProgress: () => undefined,
      });
      onChange({ imageUrl: url });
      toast(t("catalogs.coverUploadDone"));
    } catch {
      toast(t("catalogs.coverUploadError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-sm border border-black/10 bg-white/80 p-3">
      <Label>{t("catalogs.coverUpload")}</Label>
      <p className="mt-1 text-xs text-ink/55">{t("catalogs.coverUploadSpec", { spec })}</p>
      <p className="mt-1 text-xs text-ink/50">{t("catalogs.coverUploadScope")}</p>
      {imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-black/10 bg-[#ebe4d8]/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="aspect-[1/1.414] w-full object-cover" />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || busy || !slug} onClick={() => inputRef.current?.click()}>
          {busy ? t("common.loading") : imageUrl ? t("catalogs.coverUploadReplace") : t("catalogs.coverUploadPick")}
        </Button>
        {imageUrl ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange({ imageUrl: undefined })}>
            {t("catalogs.coverUploadRemove")}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onPick(file);
        }}
      />
    </div>
  );
}
