import type { MockupSaveStep } from "@/lib/mockup/clientRender";
import type { Fabric } from "@/types";

export type FabricSavePhase =
  | { step: "idle" }
  | { step: "fabric"; catalogTotal: number }
  | { step: "catalogs"; done: number; total: number }
  | { step: "mockup"; mockup: MockupSaveStep }
  | { step: "done"; catalogTotal: number }
  | { step: "error"; message: string };

export type SaveReceipt = { at: string; status: Fabric["status"]; names: string[] };

export function formatSaveClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function mockupStepText(t: Translate, step: MockupSaveStep) {
  if (step === "fabric") return t("designs.saveFabric");
  if (step === "render") return t("designs.mockupStepRender");
  if (step === "upload1") return t("designs.mockupStepUpload", { n: 1 });
  if (step === "upload2") return t("designs.mockupStepUpload", { n: 2 });
  return t("designs.mockupStepSave");
}

export function savePhaseText(t: Translate, phase: FabricSavePhase) {
  if (phase.step === "error") return phase.message;
  if (phase.step === "mockup") return mockupStepText(t, phase.mockup);
  if (phase.step === "idle") return "";
  const saving = t("designs.saveFabric");
  const ready = t("designs.saveDone");
  if (phase.step === "fabric") return saving;
  if (phase.step === "catalogs") return `${saving} → ${t("designs.saveCatalogs", { done: phase.done, total: phase.total })}`;
  if (phase.catalogTotal > 0) {
    const catalogs = t("designs.saveCatalogs", { done: phase.catalogTotal, total: phase.catalogTotal });
    return `${saving} → ${catalogs} → ${ready}`;
  }
  return `${saving} → ${ready}`;
}
