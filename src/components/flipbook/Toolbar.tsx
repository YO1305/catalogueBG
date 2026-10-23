"use client";

import { ChevronLeft, ChevronRight, Download, Languages, LayoutGrid, Mail, Maximize2, MoreHorizontal, Search, Share2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import type { Lang } from "@/types";

export function Toolbar({
  page,
  total,
  langs,
  portrait,
  cart,
  onPrev,
  onNext,
  onSeek,
  onThumbs,
  onSearch,
  onShare,
  onPdf,
  onLead,
  onFull,
}: {
  page: number;
  total: number;
  langs: Lang[];
  portrait: boolean;
  cart: number;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (index: number) => void;
  onThumbs: () => void;
  onSearch: () => void;
  onShare: () => void;
  onPdf: () => void;
  onLead: () => void;
  onFull: () => void;
}) {
  const { lang, setLang, t } = useI18n();
  const [more, setMore] = useState(false);
  const [pages, setPages] = useState(false);
  const langsRow = (
    <div className="flex gap-1">
      {langs.map((item) => (
        <button key={item} type="button" className={`px-2 py-1 text-xs uppercase ${item === lang ? "bg-majolica text-paper" : ""}`} onClick={() => setLang?.(item)}>
          {item}
        </button>
      ))}
    </div>
  );
  const pager = (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={t("common.back")} onClick={onPrev}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="font-mono text-xs">{t("catalog.of", { current: page, total })}</span>
      <button type="button" aria-label={t("common.next")} onClick={onNext}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 px-3 pb-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-white/40 bg-[#f7f3ec]/95 px-3 py-2 text-ink shadow-lg">
        <input aria-label={t("catalog.pages")} type="range" min={1} max={Math.max(total, 1)} value={page} onChange={(event) => onSeek(Number(event.target.value) - 1)} />
        {portrait ? (
          <div className="flex items-center justify-between">
            <IconButton label={t("catalog.thumbs")} onClick={onThumbs}>
              <LayoutGrid className="h-5 w-5" />
            </IconButton>
            <IconButton label={t("catalog.pages")} onClick={() => setPages((value) => !value)}>
              <span className="font-mono text-xs">{page}</span>
            </IconButton>
            <IconButton label={t("common.language")} onClick={() => setMore(false)}>
              <Languages className="h-5 w-5" />
            </IconButton>
            <IconButton label={t("catalog.more")} onClick={() => setMore((value) => !value)}>
              <MoreHorizontal className="h-5 w-5" />
            </IconButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <IconButton label={t("catalog.thumbs")} onClick={onThumbs}>
              <LayoutGrid className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("common.search")} onClick={onSearch}>
              <Search className="h-4 w-4" />
            </IconButton>
            {pager}
            {langsRow}
            <IconButton label={t("catalog.fullscreen")} onClick={onFull}>
              <Maximize2 className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.share")} onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.pdf")} onClick={onPdf}>
              <Download className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.lead")} onClick={onLead}>
              <Mail className="h-4 w-4" />
              {cart ? <span className="font-mono text-[10px]">{cart}</span> : null}
            </IconButton>
          </div>
        )}
        {portrait && pages ? pager : null}
        {portrait ? langsRow : null}
        {portrait && more ? (
          <div className="flex justify-between">
            <IconButton label={t("common.search")} onClick={onSearch}>
              <Search className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.share")} onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.pdf")} onClick={onPdf}>
              <Download className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.fullscreen")} onClick={onFull}>
              <Maximize2 className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("catalog.lead")} onClick={onLead}>
              <Mail className="h-4 w-4" />
            </IconButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
