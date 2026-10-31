"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { syncFabricCatalogsAction } from "@/lib/actions";
import { catalogSlugDiff, slugsWithFabric } from "@/lib/catalogMembership";
import type { FabricSavePhase, SaveReceipt } from "@/lib/fabricSavePhase";
import type { MockupSaveStep } from "@/lib/mockup/clientRender";
import { isHandledActionFail, runAdminAction } from "@/lib/runAdminAction";
import type { Catalog, Fabric, FabricKind, Mockup } from "@/types";

type Slot = Pick<Mockup, "templateId" | "productType">;
type Saved = { ok: true; id: string; updatedAt: string; status: Fabric["status"] };
type Failed = { ok: false; error?: string };

type EditorSave = {
  fabric: Fabric;
  saveDraft: () => Promise<Saved | Failed>;
  publish: () => Promise<Saved | Failed>;
  runMockup: (
    slot: Slot | undefined,
    options: {
      onPersisted?: (fabric: Fabric) => void;
      onProgress?: (step: MockupSaveStep) => void;
      signal?: AbortSignal;
    },
  ) => Promise<number>;
};

export function useFabricSaveFlow(initial: Fabric, isNew: boolean, catalogs: Catalog[], kind: FabricKind, editor: EditorSave) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [catalogSlugs, setCatalogSlugs] = useState(() => slugsWithFabric(catalogs, initial.id));
  const [baselineSlugs, setBaselineSlugs] = useState(() => slugsWithFabric(catalogs, initial.id));
  const [savedAt, setSavedAt] = useState<string | null>(isNew ? null : initial.updatedAt);
  const [phase, setPhase] = useState<FabricSavePhase>({ step: "idle" });
  const [receipt, setReceipt] = useState<SaveReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [mockupBusy, setMockupBusy] = useState(false);
  const [intent, setIntent] = useState<"draft" | "publish" | null>(null);
  const seenId = useRef(initial.id);
  if (seenId.current !== initial.id) {
    seenId.current = initial.id;
    setCatalogSlugs(slugsWithFabric(catalogs, initial.id));
    setBaselineSlugs(slugsWithFabric(catalogs, initial.id));
    setSavedAt(isNew ? null : initial.updatedAt);
    setReceipt(null);
    setPhase({ step: "idle" });
  }

  function catalogTotal(selected: string[]) {
    const diff = catalogSlugDiff(baselineSlugs, selected);
    return diff.add.length + diff.remove.length;
  }

  function namesFor(slugs: string[]) {
    return slugs.map((slug) => {
      const catalog = catalogs.find((item) => item.slug === slug);
      return catalog ? catalog.title[lang] || catalog.title.ru : slug;
    });
  }

  function failText(result: Failed | undefined, fallback: string) {
    const error = result?.error;
    if (error === "quota") return t("error.quota");
    if (error === "timeout") return t("error.timeout");
    if (error === "art_taken") return t("wizard.artTaken");
    if (error === "missing") return t("designs.saveCatalogFailed");
    return fallback;
  }

  async function persistCatalogs(fabricId: string, selected: string[]) {
    const diff = catalogSlugDiff(baselineSlugs, selected);
    const total = diff.add.length + diff.remove.length;
    if (!total) return true;
    setPhase({ step: "catalogs", done: 1, total });
    const linked = await runAdminAction(t, () => syncFabricCatalogsAction(fabricId, diff.add, diff.remove));
    if (!linked || isHandledActionFail(linked) || !linked.ok) {
      const failed = linked && !linked.ok ? linked : undefined;
      setPhase({ step: "error", message: failText(failed, t("designs.saveCatalogFailed")) });
      return false;
    }
    setBaselineSlugs(selected);
    return true;
  }

  async function finish(saveLive: boolean) {
    const selected = catalogSlugs;
    setIntent(saveLive ? "publish" : "draft");
    setBusy(true);
    setReceipt(null);
    setPhase({ step: "fabric", catalogTotal: catalogTotal(selected) });
    try {
      const saved = await runAdminAction(t, async () => (saveLive ? await editor.publish() : await editor.saveDraft()));
      if (!saved || isHandledActionFail(saved) || !saved.ok) {
        const failed = saved && !saved.ok ? saved : undefined;
        const message = failText(failed, t("designs.saveFailed"));
        if (failed?.error === "art_taken") toast(t("wizard.artTaken"));
        setPhase({ step: "error", message });
        return;
      }
      if (saveLive && !selected.length) toast(t("designs.pickCatalogToPublish"));
      const catalogsOk = await persistCatalogs(saved.id, selected);
      if (!catalogsOk) return;
      setSavedAt(saved.updatedAt);
      setReceipt({ at: saved.updatedAt, status: saved.status, names: namesFor(selected) });
      setPhase({ step: "done", catalogTotal: catalogTotal(selected) });
      if (isNew) router.push(`/admin/fabrics?kind=${kind}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveMockup(slot: Slot, onProgress?: (step: MockupSaveStep) => void, signal?: AbortSignal) {
    const selected = catalogSlugs;
    setMockupBusy(true);
    setPhase(editor.fabric.persisted ? { step: "mockup", mockup: "render" } : { step: "fabric", catalogTotal: catalogTotal(selected) });
    let openedEdit = false;
    let catalogFailed = false;
    try {
      const count = await editor.runMockup(slot, {
        signal,
        onProgress: (step) => {
          setPhase({ step: "mockup", mockup: step });
          onProgress?.(step);
        },
        onPersisted: (persisted) => {
          if (!isNew || openedEdit) return;
          openedEdit = true;
          router.replace(`/admin/fabrics/${persisted.id}`);
        },
      });
      if (!count) {
        setPhase({ step: "idle" });
        return count;
      }
      const catalogsOk = await persistCatalogs(editor.fabric.id, selected);
      if (!catalogsOk) {
        catalogFailed = true;
        throw new Error(t("designs.saveCatalogFailed"));
      }
      setSavedAt(new Date().toISOString());
      setPhase({ step: "done", catalogTotal: catalogTotal(selected) });
      return count;
    } catch (error) {
      if (!catalogFailed) {
        const message = error instanceof Error ? error.message : t("designs.saveFailed");
        setPhase({ step: "error", message });
      }
      throw error;
    } finally {
      setMockupBusy(false);
    }
  }

  return { catalogSlugs, setCatalogSlugs, savedAt, phase, receipt, busy, mockupBusy, intent, finish, saveMockup };
}
