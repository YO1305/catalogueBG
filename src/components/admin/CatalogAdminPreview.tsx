"use client";

import { useMemo, useState } from "react";
import type { BookModel } from "@/components/flipbook/Book";
import { StaticPage } from "@/components/flipbook/StaticPage";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";

/** Static page preview for admin — no page-flip RAF loop (that froze save/publish). */
export function CatalogAdminPreview({ model }: { model: BookModel }) {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const total = model.pages.length;
  const current = model.pages[Math.min(page, Math.max(total - 1, 0))];
  const size = useMemo(() => {
    if (typeof window === "undefined") return { w: 360, h: 510 };
    const maxH = Math.min(720, Math.max(360, window.innerHeight - 160));
    const w = Math.round(maxH / 1.414);
    return { w, h: maxH };
  }, []);

  if (!current || total < 1) {
    return <p className="p-6 text-sm text-ink/50">{t("catalogs.preview")}</p>;
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col bg-sand">
      <div className="flex items-center justify-between gap-2 bg-white/80 px-3 py-2 text-xs text-ink/60">
        <span>{t("catalogs.preview")}</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="h-8 px-2" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            {t("common.back")}
          </Button>
          <span>
            {page + 1} / {total}
          </span>
          <Button type="button" variant="outline" className="h-8 px-2" disabled={page >= total - 1} onClick={() => setPage((p) => Math.min(total - 1, p + 1))}>
            {t("common.next")}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto p-4">
        <StaticPage
          model={model}
          page={current}
          index={page}
          width={size.w}
          height={size.h}
          onOpen={() => undefined}
          onRequest={() => undefined}
          onLead={() => undefined}
          onJump={setPage}
        />
      </div>
    </div>
  );
}
