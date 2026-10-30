"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MeshEditor } from "@/components/mockup/MeshEditor";
import { TemplateRebuildButton } from "@/components/admin/TemplateRebuildButton";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { saveTemplateAction } from "@/lib/actions";
import { summarizePsd, type LayerNode } from "@/lib/psdSummary";
import type { ProductType, Template, TemplateArea } from "@/types";

export function TemplateList({ templates, products }: { templates: Template[]; products: ProductType[] }) {
  const { lang, t } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">{t("templates.title")}</h1>
        <a href="/admin/templates/new" className="bg-majolica px-4 py-2 text-sm text-paper">{t("templates.new")}</a>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <article key={template.id} className="bg-white p-4">
            <img src={template.thumbnailUrl} alt={template.name} className="aspect-[3/2] w-full object-cover" />
            <h2 className="mt-3 font-display text-2xl">{template.name}</h2>
            <p className="text-sm text-ink/60">{template.productTypes.map((id) => products.find((item) => item.id === id)?.name[lang] ?? id).join(", ")}</p>
            <p className="mt-1 text-sm">{template.compatibility.ok ? t("templates.compatOk") : t("templates.compatWarn")}</p>
            {template.isDefault ? <p className="text-xs uppercase text-gold">{t("templates.default")}</p> : null}
            <TemplateRebuildButton template={template} />
          </article>
        ))}
      </div>
    </div>
  );
}

export function TemplateWizard({ products }: { products: ProductType[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState("");
  const [areas, setAreas] = useState<TemplateArea[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tree, setTree] = useState<LayerNode[]>([]);
  const [bind, setBind] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [size, setSize] = useState({ w: 1500, h: 1000, mb: 0, fileName: "" });
  const steps = [t("templates.stepUpload"), t("templates.stepZones"), t("templates.stepCalibrate"), t("templates.stepCheck"), t("templates.stepBind")];

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".psd")) return toast(t("error.psd"));
    const buffer = await file.arrayBuffer();
    const { readPsd } = await import("ag-psd");
    const summary = summarizePsd(readPsd(buffer));
    setTree(summary.tree);
    setWarnings(summary.warnings);
    setSize({ w: summary.width || 1500, h: summary.height || 1000, mb: Math.round((file.size / 1024 / 1024) * 10) / 10, fileName: file.name });
    setAreas(summary.areas.map((area, index) => ({
      id: `area-${index + 1}`,
      label: area.name,
      psdLayerPath: area.path,
      soWidthPx: area.width || 800,
      soHeightPx: area.height || 600,
      transform: area.transform.length >= 8 ? area.transform : [100, 100, 700, 100, 700, 500, 100, 500],
      pxPerCm: 4,
      realWidthCm: 200,
      fill: true,
    })));
    setPreview("");
    setStep(1);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl">{t("templates.new")}</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {steps.map((label, index) => <button key={label} type="button" className={`px-2 py-1 ${step === index ? "bg-majolica text-paper" : "bg-white"}`} onClick={() => setStep(index)}>{label}</button>)}
      </div>
      {step === 0 ? <input className="mt-6" type="file" accept=".psd" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} /> : null}
      {step === 1 ? (
        <div className="mt-4 space-y-3">
          <MeshEditor width={size.w} height={size.h} imageUrl={preview} areas={areas} onChange={setAreas} />
          <Label>{t("templates.zoneName")}</Label>
          {areas.map((area) => (
            <div key={area.id} className="grid gap-2 bg-white p-3 md:grid-cols-[1fr_auto]">
              <Input value={area.label} onChange={(event) => setAreas(areas.map((item) => item.id === area.id ? { ...item, label: event.target.value } : item))} />
              <Checkbox checked={area.fill} label={t("templates.fill")} onCheckedChange={(fill) => setAreas(areas.map((item) => item.id === area.id ? { ...item, fill } : item))} />
            </div>
          ))}
        </div>
      ) : null}
      {step === 2 ? areas.map((area) => (
        <div key={area.id} className="mt-3 grid grid-cols-2 gap-2 bg-white p-3">
          <div>
            <Label>{t("templates.realWidth")}</Label>
            <Input type="number" value={area.realWidthCm} onChange={(event) => {
              const realWidthCm = Number(event.target.value);
              const xs = [area.transform[0], area.transform[2], area.transform[4], area.transform[6]].filter((value): value is number => typeof value === "number");
              const widthPx = Math.max(...xs) - Math.min(...xs);
              setAreas(areas.map((item) => item.id === area.id ? { ...item, realWidthCm, pxPerCm: realWidthCm ? widthPx / realWidthCm : item.pxPerCm } : item));
            }} />
          </div>
          <div>
            <Label>{t("templates.pxPerCm")}</Label>
            <p className="pt-2 font-mono">{area.pxPerCm.toFixed(2)}</p>
          </div>
        </div>
      )) : null}
      {step === 3 ? (
        <div className="mt-4 bg-white p-4 text-sm">
          <p>{t("templates.unsupported")}</p>
          <ul className="mt-2 list-disc pl-5">{warnings.length ? warnings.map((warning) => <li key={warning}>{warning}</li>) : <li>{t("templates.compatOk")}</li>}</ul>
          <pre className="mt-3 max-h-48 overflow-auto text-xs">{JSON.stringify(tree, null, 2)}</pre>
        </div>
      ) : null}
      {step === 4 ? (
        <form className="mt-4 space-y-3 bg-white p-4" onSubmit={async (event) => {
          event.preventDefault();
          const id = crypto.randomUUID();
          const template: Template = {
            id,
            productTypes: bind,
            name: name || size.fileName,
            source: { psdUrl: "", fileName: size.fileName, sizeMb: size.mb, widthPx: size.w, heightPx: size.h },
            engine: warnings.length ? "photopea" : "webgl",
            compatibility: { ok: warnings.length === 0, warnings },
            baked: { backgroundUrl: preview, overlays: [], jsonUrl: "" },
            areas,
            thumbnailUrl: preview,
            isDefault,
            order: 100,
          };
          await saveTemplateAction(template);
          router.push("/admin/templates");
          router.refresh();
        }}>
          <Label>{t("common.name")}</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
          {products.map((product) => <Checkbox key={product.id} checked={bind.includes(product.id)} label={product.name.ru} onCheckedChange={(checked) => setBind(checked ? [...bind, product.id] : bind.filter((id) => id !== product.id))} />)}
          <Checkbox checked={isDefault} label={t("templates.default")} onCheckedChange={setIsDefault} />
          <Button type="submit">{t("common.save")}</Button>
        </form>
      ) : null}
    </div>
  );
}
