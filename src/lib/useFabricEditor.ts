"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createCollectionAction, createFabricTypeAction, createFinishAction, createProductTypeAction, publishFabricAction, saveFabricAction } from "@/lib/actions";
import { prepareUploadImage } from "@/lib/prepareUploadImage";
import { useMockupJobs } from "@/lib/useMockupJobs";
import { useToneEditor } from "@/lib/useToneEditor";
import { useWeaveEditor } from "@/lib/useWeaveEditor";
import type { Collection, Fabric, FabricType, FabricVariant, Finish, Mockup, ProductType, Template } from "@/types";

type Lists = { collections: Collection[]; fabricTypes: FabricType[]; finishes: Finish[]; productTypes: ProductType[] };

export function useFabricEditor(
  initial: Fabric,
  listsIn: Lists,
  templates: Template[],
  t: (key: string) => string,
) {
  const [fabric, setFabric] = useState(initial);
  const [lists, setLists] = useState(listsIn);
  const [progress, setProgress] = useState(0);
  const dirty = useRef(false);
  const autosaving = useRef(false);
  const fabricRef = useRef(fabric);
  fabricRef.current = fabric;

  const { collections, fabricTypes, finishes, productTypes } = listsIn;
  useEffect(() => {
    setLists({ collections, fabricTypes, finishes, productTypes });
  }, [collections, fabricTypes, finishes, productTypes]);

  /** A refresh after saving brings back the same fabric as it was at save time; only another fabric resets the form. */
  useEffect(() => {
    if (initial.id === fabricRef.current.id) return;
    setFabric(initial);
    setProgress(0);
    dirty.current = false;
  }, [initial]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!dirty.current || autosaving.current || !fabricRef.current.art) return;
      dirty.current = false;
      autosaving.current = true;
      void fetch("/api/fabrics/autosave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fabricRef.current),
      })
        .catch(() => {
          dirty.current = true;
        })
        .finally(() => {
          autosaving.current = false;
        });
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  function update(partial: Partial<Fabric>) {
    dirty.current = true;
    fabricRef.current = { ...fabricRef.current, ...partial };
    setFabric((current) => ({ ...current, ...partial }));
  }

  const weave = useWeaveEditor(fabricRef, update, templates, uploadDesign);
  const tones = useToneEditor(fabricRef, update, uploadDesign);
  const mockupJobs = useMockupJobs(fabricRef, setFabric, templates);

  async function upload(raw: File) {
    const data = await uploadDesign(raw);
    if (!data) return;
    update({ design: { ...fabricRef.current.design, ...data, seamless: fabricRef.current.design.seamless }, colors: data.colors });
    if (fabricRef.current.woven) void weave.autoColor(data.webUrl);
  }

  async function addVariant(raw: File) {
    const data = await uploadDesign(raw);
    if (!data) return;
    const design = { originalUrl: data.originalUrl, webUrl: data.webUrl, thumbUrl: data.thumbUrl, widthPx: data.widthPx, heightPx: data.heightPx, seamless: fabricRef.current.design.seamless };
    const variant: FabricVariant = { id: crypto.randomUUID(), name: "", design, mockups: [] };
    update({ variants: [...(fabricRef.current.variants ?? []), variant] });
  }

  function patchVariant(id: string, partial: Partial<FabricVariant>) {
    update({ variants: (fabricRef.current.variants ?? []).map((item) => (item.id === id ? { ...item, ...partial } : item)) });
  }

  function removeVariant(id: string) {
    update({ variants: (fabricRef.current.variants ?? []).filter((item) => item.id !== id) });
  }

  async function uploadDesign(raw: File) {
    if (raw.size > 50 * 1024 * 1024) {
      toast(t("error.file"));
      return null;
    }
    let file: File;
    try {
      file = await prepareUploadImage(raw);
    } catch {
      toast(t("error.file"));
      return null;
    }
    const body = new FormData();
    body.append("file", file);
    const data = await new Promise<{ webUrl: string; thumbUrl: string; originalUrl: string; widthPx: number; heightPx: number; colors: string[] } | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/images/process");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(event.loaded / event.total);
      };
      xhr.onload = () => {
        if (xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as { webUrl: string; thumbUrl: string; originalUrl: string; widthPx: number; heightPx: number; colors: string[] });
          return;
        }
        resolve(null);
        if (xhr.status === 403) toast(t("error.forbidden"));
        else if (xhr.status === 503) toast(t("error.storage"));
        else if (xhr.status === 413) toast(t("error.uploadTooLarge"));
        else toast(t("error.file"));
      };
      xhr.onerror = () => {
        resolve(null);
        toast(t("error.network"));
      };
      xhr.send(body);
    });
    setProgress(0);
    return data;
  }

  function chooseTemplate(productType: string, template: Template, selected: boolean) {
    const current = fabricRef.current;
    const mockups = current.mockups.filter((item) => !(item.templateId === template.id && item.productType === productType));
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
    const productTypes = selected && !current.productTypes.includes(productType)
      ? [...current.productTypes, productType]
      : current.productTypes;
    update({ mockups, productTypes });
  }

  function applyCollectionCategory(collectionId: string) {
    const type = lists.fabricTypes.find((item) => item.id === fabricRef.current.fabricTypeId);
    const suggested = type?.suggestedProductTypes ?? [];
    update({
      collectionId,
      productTypes: fabricRef.current.productTypes.length ? fabricRef.current.productTypes : suggested,
    });
  }

  async function saveDraft() {
    const result = await saveFabricAction({ ...fabricRef.current, status: "draft" });
    if (!result.ok) return { ok: false as const, reason: "art" as const };
    dirty.current = false;
    return { ok: true as const, id: fabricRef.current.id };
  }

  async function publish() {
    const payload = fabricRef.current;
    const result = await publishFabricAction(payload);
    if (!result.ok) return { ok: false as const, reason: "art" as const };
    dirty.current = false;
    void mockupJobs
      .run()
      .then((count) => {
        if (count) toast(t("designs.mockupsReady"));
      })
      .catch((error: unknown) => toast(`${t("designs.mockupRenderFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    return { ok: true as const, catalogs: result.catalogs };
  }

  return {
    fabric,
    lists,
    setLists,
    progress,
    update,
    upload,
    chooseTemplate,
    applyCollectionCategory,
    addVariant,
    patchVariant,
    removeVariant,
    weave,
    tones,
    saveDraft,
    publish,
    mockupJobs,
    templates,
    onCreateCollection: async (name: string, extra?: { auto?: boolean }) => {
      const result = await createCollectionAction({ nameRu: name, autoCatalog: Boolean(extra?.auto) });
      if (!result.ok) return null;
      setLists((current) => ({ ...current, collections: [...current.collections, result.item] }));
      return result.item;
    },
    onCreateFabricType: async (name: string, extra?: { ids?: string[] }) => {
      const result = await createFabricTypeAction({ nameRu: name, suggestedProductTypes: extra?.ids ?? [] });
      if (!result.ok) return null;
      setLists((current) => ({ ...current, fabricTypes: [...current.fabricTypes, result.item] }));
      return result.item;
    },
    onCreateFinish: async (name: string) => {
      const result = await createFinishAction({ nameRu: name });
      if (!result.ok) return null;
      setLists((current) => ({ ...current, finishes: [...current.finishes, result.item] }));
      return result.item;
    },
    onCreateProduct: async (name: string, extra?: { ids: string[] }) => {
      const result = await createProductTypeAction({ nameRu: name, suggestedFor: extra?.ids ?? [] });
      if (!result.ok) return null;
      setLists((current) => ({ ...current, productTypes: [...current.productTypes, result.item] }));
      update({ productTypes: [...fabricRef.current.productTypes, result.item.id] });
      return result.item;
    },
  };
}
