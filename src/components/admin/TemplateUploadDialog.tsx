"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { saveTemplateAction } from "@/lib/actions";
import { buildTemplateFromPsd } from "@/lib/importPsdTemplate";
import { MOCKUP_CATEGORIES, mockupCategoryLabelKey } from "@/lib/mockupCategories";
import type { MockupCategory } from "@/types";

export function TemplateUploadDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MockupCategory>("bedding");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = document.getElementById("mockup-file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return toast(t("mockups.needFile"));
    if (!file.name.toLowerCase().endsWith(".psd")) return toast(t("error.psd"));
    setBusy(true);
    try {
      const template = await buildTemplateFromPsd(file, category, name);
      const result = await saveTemplateAction(template);
      if (!result.ok) return toast(t("catalogs.errorSave"));
      toast(t("common.save"));
      onOpenChange(false);
      setName("");
      onSaved();
    } catch {
      toast(t("error.file"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,24rem)]">
        <DialogTitle>{t("mockups.upload")}</DialogTitle>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("mockups.namePlaceholder")} />
          </div>
          <div>
            <Label>{t("mockups.categoryLabel")}</Label>
            <select className="h-9 w-full border bg-white px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value as MockupCategory)}>
              {MOCKUP_CATEGORIES.map((item) => (
                <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("mockups.file")}</Label>
            <input id="mockup-file" className="mt-1 block w-full text-sm" type="file" accept=".psd" />
            <p className="mt-1 text-xs text-ink/50">{t("templates.stepUpload")} · PSD</p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t("mockups.uploading") : t("common.save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
