"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WizardCardStep } from "@/components/admin/WizardCardStep";
import { WizardMockupStep } from "@/components/admin/WizardMockupStep";
import { WizardPublishStep } from "@/components/admin/WizardPublishStep";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { createCollectionAction, createFabricTypeAction, createProductTypeAction, publishFabricAction, saveFabricAction } from "@/lib/actions";
import type { Collection, Fabric, FabricType, GlossaryTerm, Mockup, ProductType, Template } from "@/types";

const STEPS = ["wizard.design", "wizard.data", "wizard.mockups", "wizard.publish"] as const;

export function FabricWizard({
  initial,
  collections,
  fabricTypes,
  productTypes,
  templates,
  glossary,
}: {
  initial: Fabric;
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  templates: Template[];
  glossary: GlossaryTerm[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fabric, setFabric] = useState(initial);
  const [lists, setLists] = useState({ collections, fabricTypes, productTypes });
  const [progress, setProgress] = useState(0);
  const [suspects, setSuspects] = useState<string[]>([]);
  const [engine, setEngine] = useState("");
  const dirty = useRef(false);
  const fabricRef = useRef(fabric);
  fabricRef.current = fabric;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!dirty.current || !fabricRef.current.art) return;
      dirty.current = false;
      void saveFabricAction(fabricRef.current).then(() => toast(t("wizard.saved")));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [t]);

  function update(partial: Partial<Fabric>) {
    dirty.current = true;
    setFabric((current) => ({ ...current, ...partial }));
  }

  async function upload(file: File) {
    if (file.size > 50 * 1024 * 1024) return toast(t("error.file"));
    const body = new FormData();
    body.append("file", file);
    const data = await new Promise<{ webUrl: string; thumbUrl: string; originalUrl: string; widthPx: number; heightPx: number; colors: string[] }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/images/process");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(event.loaded / event.total);
      };
      xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error("file")));
      xhr.onerror = () => reject(new Error("file"));
      xhr.send(body);
    }).catch(() => null);
    if (!data) return toast(t("error.file"));
    update({ design: { ...fabric.design, ...data, seamless: fabric.design.seamless }, colors: data.colors });
  }

  function chooseTemplate(productType: string, template: Template, selected: boolean) {
    const mockups = fabric.mockups.filter((item) => !(item.templateId === template.id && item.productType === productType));
    if (selected) {
      const created: Mockup = {
        productType,
        templateId: template.id,
        url: template.thumbnailUrl,
        thumbUrl: template.thumbnailUrl,
        sameForAllAreas: true,
        areas: template.areas.map((area) => ({ areaId: area.id, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })),
        engine: template.engine,
        generatedAt: new Date().toISOString(),
      };
      mockups.push(created);
    }
    update({ mockups });
  }

  const checks = [
    Boolean(fabric.design.webUrl),
    fabric.rapport.widthCm > 0 && fabric.rapport.heightCm > 0,
    fabric.mockups.length > 0,
    Boolean(fabric.name.en && fabric.name.uz),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex gap-2 text-sm">
        {STEPS.map((key, index) => (
          <button key={key} type="button" className={`px-3 py-1 ${index === step ? "bg-majolica text-paper" : "bg-white"}`} onClick={() => setStep(index)}>
            {index + 1}. {t(key)}
          </button>
        ))}
      </div>
      {step === 0 ? (
        <section className="bg-white p-5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void upload(file); }}>
          <p className="font-display text-2xl">{t("wizard.drop")}</p>
          <p className="text-sm text-ink/60">{t("wizard.dropHint")}</p>
          <input className="mt-4" type="file" accept="image/jpeg,image/png,image/tiff,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          {progress > 0 && progress < 1 ? <p className="mt-2 text-sm">{Math.round(progress * 100)}%</p> : null}
          {fabric.design.webUrl ? <img src={fabric.design.thumbUrl || fabric.design.webUrl} alt={fabric.art} className="mt-4 h-48 w-48 object-cover" /> : null}
          <p className="mt-2 font-mono text-xs">{fabric.design.widthPx} × {fabric.design.heightPx}</p>
          <div className="mt-4"><Checkbox checked={fabric.design.seamless} onCheckedChange={(seamless) => update({ design: { ...fabric.design, seamless } })} label={t("wizard.seamless")} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>{t("wizard.rapport")}</Label>
              <Input type="number" value={fabric.rapport.widthCm || ""} onChange={(event) => update({ rapport: { ...fabric.rapport, widthCm: Number(event.target.value) } })} />
            </div>
            <div>
              <Label>{t("wizard.rapport")}</Label>
              <Input type="number" value={fabric.rapport.heightCm || ""} onChange={(event) => update({ rapport: { ...fabric.rapport, heightCm: Number(event.target.value) } })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">{fabric.colors.map((color) => <span key={color} className="h-6 w-6 rounded-full border" style={{ background: color }} />)}</div>
        </section>
      ) : null}
      {step === 1 ? (
        <WizardCardStep
          fabric={fabric}
          collections={lists.collections}
          fabricTypes={lists.fabricTypes}
          productTypes={lists.productTypes}
          onChange={update}
          onCreateCollection={async (name, extra) => {
            const result = await createCollectionAction({ nameRu: name, autoCatalog: Boolean(extra?.auto) });
            if (!result.ok) return null;
            setLists((current) => ({ ...current, collections: [...current.collections, result.item] }));
            return result.item;
          }}
          onCreateFabricType={async (name, extra) => {
            const result = await createFabricTypeAction({ nameRu: name, suggestedProductTypes: extra?.ids ?? [] });
            if (!result.ok) return null;
            setLists((current) => ({ ...current, fabricTypes: [...current.fabricTypes, result.item] }));
            return result.item;
          }}
        />
      ) : null}
      {step === 2 ? (
        <WizardMockupStep
          fabric={fabric}
          fabricTypes={lists.fabricTypes}
          productTypes={lists.productTypes}
          templates={templates}
          onChange={update}
          onChoose={chooseTemplate}
          onCreateProduct={async (name, extra) => {
            const result = await createProductTypeAction({ nameRu: name, suggestedFor: extra?.ids ?? [] });
            if (!result.ok) return null;
            setLists((current) => ({ ...current, productTypes: [...current.productTypes, result.item] }));
            update({ productTypes: [...fabric.productTypes, result.item.id] });
            return result.item;
          }}
        />
      ) : null}
      {step === 3 ? (
        <WizardPublishStep
          fabric={fabric}
          glossary={glossary}
          checks={checks}
          engine={engine}
          suspects={suspects}
          onChange={update}
          onEngine={setEngine}
          onSuspects={setSuspects}
          onDraft={async () => {
            const result = await saveFabricAction({ ...fabric, status: "draft" });
            if (!result.ok) return toast(t("wizard.artTaken"));
            toast(t("wizard.saved"));
          }}
          onPublish={async () => {
            const result = await publishFabricAction(fabric);
            if (!result.ok) return toast(t("wizard.artTaken"));
            toast(result.catalogs.length ? t("wizard.published", { names: result.catalogs.join(", ") }) : t("wizard.publishedNone"));
            router.push("/admin/fabrics");
            router.refresh();
          }}
        />
      ) : null}
      <div className="mt-4 flex justify-between">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>{t("common.back")}</Button>
        <Button type="button" variant="outline" disabled={step === 3} onClick={() => setStep((value) => value + 1)}>{t("common.next")}</Button>
      </div>
    </div>
  );
}
