"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Input, Label } from "@/components/ui/field";
import { addCatalogDesignEntryAction } from "@/lib/actions";
import { processDesignUpload } from "@/lib/processDesignUpload";
import type { CatalogSection, Fabric } from "@/types";

export function CatalogDesignQuickAdd({
  slug,
  sectionId,
  disabled,
  onAdded,
}: {
  slug: string;
  sectionId?: string;
  disabled?: boolean;
  onAdded: (payload: { fabric: Fabric; fabricIds: string[]; catalogSections?: CatalogSection[] }) => void;
}) {
  const { t } = useI18n();
  const [art, setArt] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPick(file: File) {
    if (!slug || !art.trim() || !name.trim()) {
      toast(t("catalogs.designEntryNeedMeta"));
      return;
    }
    setBusy(true);
    try {
      const processed = await processDesignUpload(file, () => undefined);
      if (!processed) {
        toast(t("catalogs.designEntryUploadError"));
        return;
      }
      const result = await addCatalogDesignEntryAction({
        catalogSlug: slug,
        art: art.trim(),
        nameRu: name.trim(),
        sectionId,
        design: {
          originalUrl: processed.originalUrl,
          webUrl: processed.webUrl,
          thumbUrl: processed.thumbUrl,
          widthPx: processed.widthPx,
          heightPx: processed.heightPx,
          seamless: true,
        },
      });
      if (!result.ok) {
        if ("error" in result && result.error === "art_taken") toast(t("fabrics.errorArt"));
        else toast(t("catalogs.designEntrySaveError"));
        return;
      }
      toast(t("catalogs.designEntryDone"));
      setArt("");
      setName("");
      onAdded({
        fabric: result.fabric,
        fabricIds: result.fabricIds,
        catalogSections: result.catalogSections,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sm border border-dashed border-majolica/35 bg-white/80 p-3">
      <Label>{t("catalogs.designEntryAdd")}</Label>
      <p className="mt-1 text-xs text-ink/55">{t("catalogs.designEntryHint")}</p>
      <div className="mt-3 space-y-2">
        <Input value={art} placeholder={t("catalogs.designEntryArt")} disabled={disabled || busy} onChange={(event) => setArt(event.target.value)} />
        <Input value={name} placeholder={t("common.name")} disabled={disabled || busy} onChange={(event) => setName(event.target.value)} />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/tiff"
          className="block w-full text-sm"
          disabled={disabled || busy || !slug}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onPick(file);
            event.target.value = "";
          }}
        />
      </div>
      {busy ? <p className="mt-2 text-xs text-ink/50">{t("common.loading")}</p> : null}
      {!slug ? <p className="mt-2 text-xs text-ink/50">{t("catalogs.coverUploadNeedSlug")}</p> : null}
    </div>
  );
}
