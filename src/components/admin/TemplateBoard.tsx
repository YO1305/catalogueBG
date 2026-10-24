"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_GRID_CLASS, AdminMarketplaceCard } from "@/components/admin/AdminMarketplaceCard";
import { TemplateUploadDialog } from "@/components/admin/TemplateUploadDialog";
import { useI18n } from "@/components/i18n/I18n";
import { deleteTemplateAction, saveTemplateAction } from "@/lib/actions";
import { MOCKUP_CATEGORIES, mockupCategoryLabelKey } from "@/lib/mockupCategories";
import { isAdmin } from "@/lib/roles";
import type { MockupCategory, ProductType, Role, Template } from "@/types";

function cardBtnClass(extra?: string) {
  return `inline-flex h-7 items-center rounded border border-black/10 bg-white px-2 text-[0.6875rem] hover:bg-black/[0.03] ${extra ?? ""}`;
}

export function TemplateBoard({ templates, role }: { templates: Template[]; products: ProductType[]; role: Role }) {
  const { t } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<MockupCategory | "">("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const canUpload = isAdmin(role);

  const rows = useMemo(() => {
    if (!filter) return templates;
    return templates.filter((item) => item.category === filter || (!item.category && filter === "bedding"));
  }, [templates, filter]);

  async function remove(template: Template) {
    if (!window.confirm(t("mockups.deleteConfirm", { name: template.name }))) return;
    await deleteTemplateAction(template.id);
    toast(t("mockups.deleted"));
    router.refresh();
  }

  async function changeCategory(template: Template, category: MockupCategory) {
    await saveTemplateAction({ ...template, category });
    router.refresh();
  }

  return (
    <div className="max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl">{t("nav.mockups")}</h1>
        {canUpload ? (
          <button type="button" className="h-9 bg-majolica px-4 text-sm text-paper" onClick={() => setUploadOpen(true)}>
            {t("mockups.upload")}
          </button>
        ) : null}
      </div>
      <select className="mt-4 h-9 rounded-md border border-black/10 bg-white px-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as MockupCategory | "")}>
        <option value="">{t("designs.allCategories")}</option>
        {MOCKUP_CATEGORIES.map((item) => (
          <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
        ))}
      </select>
      {!rows.length ? <p className="mt-6 text-sm text-ink/55">{t("mockups.emptyList")}</p> : null}
      <ul className={ADMIN_GRID_CLASS}>
        {rows.map((template) => (
          <li key={template.id}>
            <AdminMarketplaceCard
              image={template.thumbnailUrl || undefined}
              placeholder={template.name.slice(0, 1)}
              title={template.name}
              meta={template.category ? t(mockupCategoryLabelKey(template.category)) : t("mockups.noCategory")}
              actions={
                <>
                  {canUpload ? (
                    <select
                      className={cardBtnClass()}
                      value={template.category ?? "bedding"}
                      onChange={(event) => void changeCategory(template, event.target.value as MockupCategory)}
                    >
                      {MOCKUP_CATEGORIES.map((item) => (
                        <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
                      ))}
                    </select>
                  ) : null}
                  {canUpload ? (
                    <button type="button" className={cardBtnClass("text-red-900 border-red-200")} onClick={() => void remove(template)}>
                      {t("common.delete")}
                    </button>
                  ) : null}
                </>
              }
            />
          </li>
        ))}
      </ul>
      <TemplateUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={() => router.refresh()} />
    </div>
  );
}
