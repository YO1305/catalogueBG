"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ADMIN_GRID_CLASS, AdminFilterBar, AdminMarketplaceCard, AdminPageHeader, cardIconActionClass, cardSelectClass } from "@/components/admin/AdminMarketplaceCard";
import { TemplateUploadDialog } from "@/components/admin/TemplateUploadDialog";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { deleteTemplateAction, saveTemplateAction } from "@/lib/actions";
import { MOCKUP_CATEGORIES, mockupCategoryLabelKey } from "@/lib/mockupCategories";
import { sortTemplatesForWizard } from "@/lib/templateSort";
import { isAdmin } from "@/lib/roles";
import type { MockupCategory, ProductType, Role, Template } from "@/types";

export function TemplateBoard({ templates, products, role }: { templates: Template[]; products: ProductType[]; role: Role }) {
  const { t } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<MockupCategory | "">("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const canUpload = isAdmin(role);

  const rows = useMemo(() => {
    const sorted = sortTemplatesForWizard(templates);
    if (!filter) return sorted;
    return sorted.filter((item) => item.category === filter || (!item.category && filter === "bedding"));
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
      <AdminPageHeader
        title={t("nav.mockups")}
        action={
          canUpload ? (
            <Button type="button" onClick={() => setUploadOpen(true)}>
              {t("templates.importZip")}
            </Button>
          ) : null
        }
      />
      <AdminFilterBar>
        <Select className="sm:w-60" value={filter} onChange={(event) => setFilter(event.target.value as MockupCategory | "")}>
          <option value="">{t("designs.allCategories")}</option>
          {MOCKUP_CATEGORIES.map((item) => (
            <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
          ))}
        </Select>
      </AdminFilterBar>
      {!rows.length ? <p className="mt-6 text-sm text-ink/55">{t("mockups.emptyList")}</p> : null}
      <ul className={ADMIN_GRID_CLASS}>
        {rows.map((template) => (
          <li key={template.id}>
            <AdminMarketplaceCard
              image={template.thumbnailUrl || undefined}
              placeholder={template.name.slice(0, 1)}
              title={template.name}
              meta={[
                template.kind === "zip" || template.engine === "uvgrid" ? "ZIP" : template.kind === "demo" ? t("templates.demo") : null,
                template.category ? t(mockupCategoryLabelKey(template.category)) : t("mockups.noCategory"),
              ]
                .filter(Boolean)
                .join(" · ")}
              actions={
                <>
                  {canUpload ? (
                    <select
                      className={cardSelectClass}
                      aria-label={t("mockups.categoryLabel")}
                      value={template.category ?? "bedding"}
                      onChange={(event) => void changeCategory(template, event.target.value as MockupCategory)}
                    >
                      {MOCKUP_CATEGORIES.map((item) => (
                        <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
                      ))}
                    </select>
                  ) : null}
                  {canUpload ? (
                    <button type="button" className={cardIconActionClass("danger")} aria-label={t("common.delete")} title={t("common.delete")} onClick={() => void remove(template)}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </>
              }
            />
          </li>
        ))}
      </ul>
      <TemplateUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={() => router.refresh()} products={products} />
    </div>
  );
}
