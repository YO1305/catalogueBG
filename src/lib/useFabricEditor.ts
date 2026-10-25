"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createCollectionAction, createFabricTypeAction, createProductTypeAction, publishFabricAction, saveFabricAction } from "@/lib/actions";
import { prepareUploadImage } from "@/lib/prepareUploadImage";
import type { Collection, Fabric, FabricType, FabricVariant, Mockup, ProductType, Template } from "@/types";

type Lists = { collections: Collection[]; fabricTypes: FabricType[]; productTypes: ProductType[] };

/** Take fresh mockup URLs from the server without undoing edits made while it rendered. */
function applyRendered(current: Fabric, row: { mockups: Mockup[]; variants?: FabricVariant[] }, variantId?: string): Fabric {
  if (!variantId) return { ...current, mockups: row.mockups };
  const rendered = row.variants?.find((item) => item.id === variantId)?.mockups;
  if (!rendered) return current;
  return { ...current, variants: (current.variants ?? []).map((item) => (item.id === variantId ? { ...item, mockups: rendered } : item)) };
}

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

  useEffect(() => {
    setLists(listsIn);
  }, [listsIn]);

  useEffect(() => {
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
    setFabric((current) => ({ ...current, ...partial }));
  }

  async function upload(raw: File) {
    const data = await uploadDesign(raw);
    if (!data) return;
    update({ design: { ...fabricRef.current.design, ...data, seamless: fabricRef.current.design.seamless }, colors: data.colors });
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
    let payload = fabricRef.current;
    if (!payload.name.en || !payload.name.uz) {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fields: { name: payload.name.ru, description: payload.description.ru, composition: payload.composition.ru },
          locked: payload.translationLocked,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { en: Record<string, string>; uz: Record<string, string> };
        payload = {
          ...payload,
          name: { ...payload.name, en: payload.translationLocked.name ? payload.name.en : data.en.name || payload.name.en, uz: payload.translationLocked.name ? payload.name.uz : data.uz.name || payload.name.uz },
          description: {
            ...payload.description,
            en: payload.translationLocked.description ? payload.description.en : data.en.description || payload.description.en,
            uz: payload.translationLocked.description ? payload.description.uz : data.uz.description || payload.description.uz,
          },
          composition: {
            ...payload.composition,
            en: payload.translationLocked.composition ? payload.composition.en : data.en.composition || payload.composition.en,
            uz: payload.translationLocked.composition ? payload.composition.uz : data.uz.composition || payload.composition.uz,
          },
        };
        setFabric(payload);
      }
    }
    const result = await publishFabricAction(payload);
    if (!result.ok) return { ok: false as const, reason: "art" as const };
    dirty.current = false;
    void renderMockupsInBackground(payload.id);
    return { ok: true as const, catalogs: result.catalogs };
  }

  /** One request per colourway keeps each call well inside the serverless time limit. */
  async function renderMockupsInBackground(fabricId: string) {
    const variantIds = (fabricRef.current.variants ?? []).filter((item) => item.design.webUrl).map((item) => item.id);
    try {
      for (const variantId of [undefined, ...variantIds]) {
        const response = await fetch("/api/mockups/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fabricId, variantId }),
        });
        const data = (await response.json()) as { ok?: boolean; fabrics?: { fabricId: string; mockups: Mockup[]; variants?: FabricVariant[] }[] };
        if (!response.ok || !data.ok) {
          toast(t("designs.mockupRenderFailed"));
          return;
        }
        const row = data.fabrics?.find((item) => item.fabricId === fabricId);
        if (row && fabricRef.current.id === fabricId) setFabric((current) => applyRendered(current, row, variantId));
      }
      toast(t("designs.mockupsReady"));
    } catch {
      toast(t("designs.mockupRenderFailed"));
    }
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
    saveDraft,
    publish,
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
    onCreateProduct: async (name: string, extra?: { ids: string[] }) => {
      const result = await createProductTypeAction({ nameRu: name, suggestedFor: extra?.ids ?? [] });
      if (!result.ok) return null;
      setLists((current) => ({ ...current, productTypes: [...current.productTypes, result.item] }));
      update({ productTypes: [...fabricRef.current.productTypes, result.item.id] });
      return result.item;
    },
  };
}
