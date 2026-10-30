"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { renderAndSave } from "@/lib/mockup/clientRender";
import type { Fabric, Template } from "@/types";

const CONCURRENCY = 3;

export function TemplateRebuildButton({ template }: { template: Template }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  async function run() {
    if (busy) return;
    setBusy(true);
    setDone(0);
    setTotal(0);
    try {
      const response = await fetch("/api/mockups/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = (await response.json()) as { fabrics?: Fabric[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? String(response.status));
      const queue = [...(data.fabrics ?? [])];
      setTotal(queue.length);
      let count = 0;
      async function worker() {
        while (queue.length) {
          const fabric = queue.shift();
          if (!fabric) break;
          const mockup = fabric.mockups.find((item) => item.templateId === template.id);
          if (mockup) {
            await renderAndSave({ ...fabric, persisted: true }, template, mockup);
            count += 1;
          }
          for (const variant of fabric.variants ?? []) {
            const variantMockup = variant.mockups.find((item) => item.templateId === template.id);
            if (!variantMockup) continue;
            await renderAndSave({ ...fabric, persisted: true }, template, variantMockup, variant.id);
            count += 1;
          }
          setDone((current) => current + 1);
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      toast(t("templates.rebuildDone", { count }));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <Button type="button" variant="outline" disabled={busy} aria-busy={busy} onClick={() => void run()}>
        {busy ? t("templates.rebuildWorking", { n: `${done}/${total || "…"}` }) : t("templates.rebuild")}
      </Button>
      {busy && total ? <p className="mt-1 text-xs text-ink/55">{t("templates.rebuildProgress", { done, total })}</p> : null}
    </div>
  );
}
