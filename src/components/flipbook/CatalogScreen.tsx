"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { FabricModal } from "@/components/fabric/FabricModal";
import type { BookModel } from "@/components/flipbook/Book";
import { CatalogDialogs } from "@/components/flipbook/CatalogDialogs";
import { StaticPage } from "@/components/flipbook/StaticPage";
import { ThumbGrid } from "@/components/flipbook/ThumbGrid";
import { Toolbar } from "@/components/flipbook/Toolbar";
import { useCatalogChrome } from "@/components/flipbook/useCatalogChrome";
import { I18nProvider, useI18n } from "@/components/i18n/I18n";
import type { Lang } from "@/types";

const Book = dynamic(() => import("@/components/flipbook/Book").then((mod) => mod.Book), { ssr: false });

const COLOR_ALIASES: Record<string, string[]> = {
  blue: ["синий"],
  gold: ["золото"],
  red: ["бордовый"],
  green: ["зелёный", "мята"],
  beige: ["песок"],
  black: ["чёрный"],
  "ko'k": ["синий"],
  oltin: ["золото"],
  yashil: ["мята", "зелёный"],
};

export function CatalogScreen({ model, initialPage, initialArt }: { model: BookModel; initialPage: number; initialArt?: string }) {
  const [lang, setLang] = useState<Lang>(model.catalog.defaultLang);
  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <Screen model={model} initialPage={initialPage} initialArt={initialArt} />
    </I18nProvider>
  );
}

function Screen({ model, initialPage, initialArt }: { model: BookModel; initialPage: number; initialArt?: string }) {
  const { lang, t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void; turnToPage: (page: number) => void } } | null>(null);
  const [box, setBox] = useState({ w: 420, h: 594, portrait: false });
  const [page, setPage] = useState(Math.min(initialPage, Math.max(model.pages.length - 1, 0)));
  const [openId, setOpenId] = useState<string | undefined>(initialArt);
  const [thumbs, setThumbs] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [share, setShare] = useState(false);
  const [lead, setLead] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [reduced, setReduced] = useState(false);
  const zoomed = useRef(new Set<string>());
  const sessionId = useRef("");
  const pageRef = useRef(page);
  pageRef.current = page;
  useCatalogChrome({
    slug: model.catalog.slug,
    pageCount: model.pages.length,
    api,
    pageRef,
    sessionId,
    setPage,
    setReduced,
    setBox,
  });

  function go(delta: number) {
    const next = Math.min(model.pages.length - 1, Math.max(0, pageRef.current + delta));
    turn(next);
  }
  function turn(index: number) {
    pageRef.current = index;
    setPage(index);
    api.current?.pageFlip().turnToPage(index);
    const url = `${location.pathname}${location.search}#p${index + 1}`;
    history.replaceState(null, "", url);
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [{ catalogSlug: model.catalog.slug, type: "page", page: index + 1, sessionId: sessionId.current, ts: new Date().toISOString() }] }),
    });
  }
  function openFabric(id: string) {
    setOpenId(id);
    const fabric = model.fabrics.find((item) => item.id === id);
    const url = `/c/${model.catalog.slug}/d/${fabric?.art ?? id}`;
    history.replaceState(null, "", url);
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [{ catalogSlug: model.catalog.slug, type: "fabric_open", fabricId: id, sessionId: sessionId.current, ts: new Date().toISOString() }] }),
    });
  }
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const aliases = COLOR_ALIASES[needle] ?? [];
    return model.fabrics.filter((fabric) => {
      const hay = [fabric.art, fabric.name.ru, fabric.name.en, fabric.name.uz, ...fabric.tags, ...fabric.colors].join(" ").toLowerCase();
      return hay.includes(needle) || aliases.some((alias) => hay.includes(alias));
    });
  }, [model.fabrics, query]);
  const opened = model.fabrics.find((fabric) => fabric.id === openId);
  const currentPage = model.pages[page];

  return (
    <div ref={root} className="catalog-root relative min-h-screen" data-theme={model.catalog.layout.theme} style={{ fontSize: box.w / 28 }}>
      <div className="flex min-h-screen items-center justify-center pb-24">
        {reduced && currentPage ? (
          <StaticPage model={model} page={currentPage} index={page} width={box.w} height={box.h} onOpen={openFabric} onLead={() => setLead(true)} onJump={turn} />
        ) : (
          <Book model={model} width={box.w} height={box.h} startPage={page} current={page} reduced={reduced} onFlip={setPage} onOpen={openFabric} onLead={() => setLead(true)} onJump={turn} apiRef={api} />
        )}
      </div>
      <Toolbar
        page={page + 1}
        total={model.pages.length}
        langs={model.catalog.langs}
        portrait={box.portrait}
        cart={cart.length}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onSeek={turn}
        onThumbs={() => setThumbs(true)}
        onSearch={() => setSearch(true)}
        onShare={() => setShare(true)}
        onPdf={() => {
          window.location.href = `/c/${model.catalog.slug}/pdf`;
        }}
        onLead={() => setLead(true)}
        onFull={() => {
          if (!document.fullscreenElement) void root.current?.requestFullscreen();
          else void document.exitFullscreen();
        }}
      />
      {thumbs ? (
        <ThumbGrid
          pages={model.pages}
          current={page}
          onPick={(index) => {
            setThumbs(false);
            turn(index);
          }}
        />
      ) : null}
      {opened ? (
        <FabricModal
          fabric={opened}
          fabrics={model.fabrics}
          catalog={model.catalog}
          fabricTypes={model.fabricTypes}
          collections={model.collections}
          productTypes={model.productTypes}
          saved={cart.includes(opened.id)}
          onClose={() => {
            setOpenId(undefined);
            history.replaceState(null, "", `/c/${model.catalog.slug}#p${page + 1}`);
          }}
          onPick={openFabric}
          onToggleSave={() => setCart((items) => (items.includes(opened.id) ? items.filter((id) => id !== opened.id) : [...items, opened.id]))}
          onZoomed={() => {
            if (zoomed.current.has(opened.id)) return;
            zoomed.current.add(opened.id);
            void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [{ catalogSlug: model.catalog.slug, type: "zoom", fabricId: opened.id, sessionId: sessionId.current, ts: new Date().toISOString() }] }) });
          }}
          onShare={() => {
            const link = `${location.origin}/c/${model.catalog.slug}/d/${opened.art}`;
            void navigator.clipboard.writeText(link);
            setNotice(t("common.copied"));
          }}
        />
      ) : null}
      <CatalogDialogs
        model={model}
        lang={lang}
        page={page}
        query={query}
        setQuery={setQuery}
        results={results}
        search={search}
        setSearch={setSearch}
        share={share}
        setShare={setShare}
        lead={lead}
        setLead={setLead}
        fabricIds={cart.length ? cart : openId ? [openId] : []}
        onOpen={openFabric}
        onDone={(text) => { setNotice(text); setLead(false); setCart([]); }}
      />
      {notice ? <p className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 bg-ink px-3 py-2 text-sm text-paper">{notice}</p> : null}
    </div>
  );
}
