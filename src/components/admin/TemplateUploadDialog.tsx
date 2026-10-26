"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { MOCKUP_CATEGORIES, mockupCategoryLabelKey } from "@/lib/mockupCategories";
import { parseTemplateZipFile } from "@/lib/templateZip/readZip";
import { completeTemplateZipImport, manifestForWire, uploadTemplateZipAssets } from "@/lib/templateZip/uploadClient";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import type { MockupCategory, ProductType } from "@/types";

type Step = "file" | "confirm";

export function TemplateUploadDialog({
  open,
  onOpenChange,
  onSaved,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  products: ProductType[];
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("file");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MockupCategory>("bedding");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [manifest, setManifest] = useState<ZipTemplateManifest | null>(null);
  const [templateJsonPath, setTemplateJsonPath] = useState("template.json");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const sortedProducts = useMemo(
    () => [...products].filter((p) => p.active).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [products],
  );

  useEffect(() => {
    if (!open) {
      setStep("file");
      setName("");
      setErrors([]);
      setManifest(null);
      setTemplateJsonPath("template.json");
      setZipFile(null);
      setProductTypes([]);
      setIsDefault(false);
      setUploadProgress("");
    }
  }, [open]);

  async function inspectFile(file: File) {
    setBusy(true);
    setErrors([]);
    try {
      const parsed = await parseTemplateZipFile(file);
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      setManifest(parsed.parsed.manifest);
      setTemplateJsonPath(parsed.parsed.jsonPath);
      setName(parsed.parsed.manifest.name);
      setZipFile(file);
      setStep("confirm");
    } catch {
      toast(t("error.file"));
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast(t("templates.zipNeedZip"));
      return;
    }
    await inspectFile(file);
  }

  function toggleProduct(id: string, checked: boolean) {
    setProductTypes((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  async function submitImport() {
    if (!zipFile || !manifest) return toast(t("mockups.needFile"));
    if (!productTypes.length) return toast(t("templates.zipNeedProducts"));
    setBusy(true);
    setErrors([]);
    const templateId = crypto.randomUUID();
    try {
      const uploaded = await uploadTemplateZipAssets(zipFile, manifest, templateJsonPath, templateId, (done, total, label) => {
        setUploadProgress(t("templates.zipProgress", { done: String(done), total: String(total), file: label }));
      });
      if (!uploaded.ok) {
        setErrors(uploaded.errors);
        return;
      }
      const finished = await completeTemplateZipImport({
        templateId,
        category,
        name: name.trim() || manifest.name,
        productTypes,
        isDefault,
        manifest: manifestForWire(manifest),
        assetUrls: uploaded.assetUrls,
        zipSizeMb: Math.round((zipFile.size / (1024 * 1024)) * 10) / 10,
      });
      if (!finished.ok) {
        setErrors(finished.errors);
        return;
      }
      toast(t("templates.zipImported"));
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("catalogs.errorSave");
      setErrors([message]);
    } finally {
      setBusy(false);
      setUploadProgress("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,28rem)] max-h-[90vh] overflow-y-auto">
        <DialogTitle>{t("templates.importZip")}</DialogTitle>
        {step === "file" ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label>{t("mockups.categoryLabel")}</Label>
              <select className="h-9 w-full border bg-white px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value as MockupCategory)}>
                {MOCKUP_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("templates.zipFile")}</Label>
              <input className="mt-1 block w-full text-sm" type="file" accept=".zip,application/zip" onChange={(event) => void onPickFile(event)} disabled={busy} />
              <p className="mt-1 text-xs text-ink/50">{t("templates.zipHint")}</p>
            </div>
            {errors.length ? (
              <ul className="list-disc pl-5 text-sm text-red-900">
                {errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {step === "confirm" && manifest ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label>{t("common.name")}</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <p className="text-xs text-ink/55">
              {manifest.size[0]}×{manifest.size[1]} px · {manifest.zones.length} {t("templates.stepZones").toLowerCase()}
              {manifest.finish ? ` · ${manifest.finish}` : ""}
            </p>
            <ul className="rounded border border-black/10 bg-black/[0.02] p-2 text-sm">
              {manifest.zones.map((zone) => (
                <li key={zone.id}>{zone.label}</li>
              ))}
            </ul>
            <div>
              <Label>{t("templates.bind")}</Label>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border border-black/10 p-2">
                {sortedProducts.map((product) => (
                  <Checkbox
                    key={product.id}
                    checked={productTypes.includes(product.id)}
                    label={product.name.ru}
                    onCheckedChange={(checked) => toggleProduct(product.id, checked)}
                  />
                ))}
              </div>
            </div>
            <Checkbox checked={isDefault} label={t("templates.default")} onCheckedChange={setIsDefault} />
            {uploadProgress ? <p className="text-xs text-ink/60">{uploadProgress}</p> : null}
            {errors.length ? (
              <ul className="list-disc pl-5 text-sm text-red-900">
                {errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => setStep("file")}>
                {t("common.back")}
              </Button>
              <Button type="button" className="flex-1" disabled={busy} onClick={() => void submitImport()}>
                {busy ? t("mockups.uploading") : t("templates.importZip")}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
