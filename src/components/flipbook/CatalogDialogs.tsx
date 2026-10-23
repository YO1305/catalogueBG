"use client";

import { LeadForm } from "@/components/flipbook/LeadForm";
import type { BookModel } from "@/components/flipbook/Book";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useI18n } from "@/components/i18n/I18n";
import type { Fabric, Lang } from "@/types";

export function CatalogDialogs({
  model,
  lang,
  page,
  query,
  setQuery,
  results,
  search,
  setSearch,
  share,
  setShare,
  lead,
  setLead,
  fabricIds,
  onOpen,
  onDone,
}: {
  model: BookModel;
  lang: Lang;
  page: number;
  query: string;
  setQuery: (value: string) => void;
  results: Fabric[];
  search: boolean;
  setSearch: (value: boolean) => void;
  share: boolean;
  setShare: (value: boolean) => void;
  lead: boolean;
  setLead: (value: boolean) => void;
  fabricIds: string[];
  onOpen: (id: string) => void;
  onDone: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent>
          <DialogTitle>{t("common.search")}</DialogTitle>
          <Input className="mt-4" value={query} placeholder={t("catalog.searchPlaceholder")} onChange={(event) => setQuery(event.target.value)} />
          <ul className="mt-3 space-y-2">
            {query && !results.length ? <li className="text-sm text-ink/60">{t("catalog.searchEmpty")}</li> : null}
            {results.map((fabric) => (
              <li key={fabric.id}>
                <button type="button" className="w-full text-left" onClick={() => { setSearch(false); onOpen(fabric.id); }}>
                  <span className="font-mono text-xs">{fabric.art}</span> {fabric.name[lang]}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent>
          <DialogTitle>{t("catalog.share")}</DialogTitle>
          <div className="mt-4 space-y-3 text-sm">
            <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/c/${model.catalog.slug}`)}>{t("catalog.copyLink")}</button>
            <button type="button" className="block underline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/c/${model.catalog.slug}#p${page + 1}`)}>{t("catalog.copyPage")}</button>
            {model.qr ? <img src={model.qr} alt={t("catalog.qr")} className="h-36 w-36" /> : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={lead} onOpenChange={setLead}>
        <DialogContent>
          <DialogTitle>{t("catalog.lead")}</DialogTitle>
          <LeadForm slug={model.catalog.slug} lang={lang} fabricIds={fabricIds} fabrics={model.fabrics} onDone={onDone} />
        </DialogContent>
      </Dialog>
    </>
  );
}
