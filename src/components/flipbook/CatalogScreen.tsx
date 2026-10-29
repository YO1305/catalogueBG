"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FabricModal } from "@/components/fabric/FabricModal";
import type { BookModel } from "@/components/flipbook/Book";
import { CatalogDialogs } from "@/components/flipbook/CatalogDialogs";
import { StaticPage } from "@/components/flipbook/StaticPage";
import { ThumbGrid } from "@/components/flipbook/ThumbGrid";
import { FlipSideNav } from "@/components/flipbook/FlipSideButtons";
import { Toolbar } from "@/components/flipbook/Toolbar";
import { useCatalogChrome } from "@/components/flipbook/useCatalogChrome";
import { I18nProvider, useI18n } from "@/components/i18n/I18n";
import { CatalogSectionJumpBar } from "@/components/flipbook/CatalogSectionJumpBar";
import { MobileCatalogFeed, type MobileCatalogFeedHandle } from "@/components/flipbook/MobileCatalogFeed";
import { catalogSectionLinks } from "@/lib/catalogSections";
import { remobileDesignPages } from "@/lib/catalogMobilePages";
import { searchFabrics } from "@/lib/catalogSearch";
import type { Lang } from "@/types";

const Book = dynamic(() => import("@/components/flipbook/Book").then((mod) => mod.Book), { ssr: false });

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
  const mobileFeedRef = useRef<MobileCatalogFeedHandle>(null);
  const [box, setBox] = useState({ w: 420, h: 594, portrait: false, mobileFeed: false });
  const [page, setPage] = useState(Math.min(initialPage, Math.max(model.pages.length - 1, 0)));
  const [openId, setOpenId] = useState<string | undefined>(initialArt);
  const [openVariant, setOpenVariant] = useState<string | undefined>();
  const [requestId, setRequestId] = useState<string | undefined>();
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
  const lastPageEvent = useRef({ index: -1, at: 0 });

  function applyPage(index: number) {
    pageRef.current = index;
    setPage(index);
    const url = `${location.pathname}${location.search}#p${index + 1}`;
    history.replaceState(null, "", url);
    const now = Date.now();
    if (lastPageEvent.current.index === index && now - lastPageEvent.current.at < 4000) return;
    lastPageEvent.current = { index, at: now };
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [{ catalogSlug: model.catalog.slug, type: "page", page: index + 1, sessionId: sessionId.current, ts: new Date().toISOString() }] }),
    });
  }

  const pages = useMemo(
    () => (box.mobileFeed ? remobileDesignPages(model.pages) : model.pages),
    [model.pages, box.mobileFeed],
  );
  const bookModel = useMemo(() => ({ ...model, pages }), [model, pages]);

  useEffect(() => {
    const max = Math.max(pages.length - 1, 0);
    if (pageRef.current > max) {
      pageRef.current = max;
      setPage(max);
      if (box.mobileFeed) mobileFeedRef.current?.scrollToPage(max);
      else api.current?.pageFlip()?.turnToPage(max);
    }
  }, [pages.length, box.mobileFeed]);

  useEffect(() => {
    if (!box.mobileFeed) return;
    const id = window.requestAnimationFrame(() => mobileFeedRef.current?.scrollToPage(pageRef.current));
    return () => window.cancelAnimationFrame(id);
  }, [box.mobileFeed, pages.length]);

  const jumpToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= pages.length) return;
      if (box.mobileFeed) {
        applyPage(index);
        mobileFeedRef.current?.scrollToPage(index);
        return;
      }
      api.current?.pageFlip()?.turnToPage(index);
      applyPage(index);
    },
    [box.mobileFeed, pages.length],
  );

  const flipTo = useCallback(
    (index: number, preferAnimate: boolean) => {
      if (index < 0 || index >= pages.length) return;
      if (index === pageRef.current) return;
      if (box.mobileFeed) {
        applyPage(index);
        mobileFeedRef.current?.scrollToPage(index);
        return;
      }
      const flip = api.current?.pageFlip();
      const diff = index - pageRef.current;
      const animate = preferAnimate && !reduced && !box.portrait && flip && Math.abs(diff) === 1;
      if (animate) {
        if (diff > 0) flip.flipNext();
        else flip.flipPrev();
        return;
      }
      flip?.turnToPage(index);
      applyPage(index);
    },
    [box.mobileFeed, box.portrait, pages.length, reduced],
  );

  const onPageCommit = useCallback((index: number) => {
    if (index === pageRef.current) return;
    applyPage(index);
  }, []);

  useCatalogChrome({
    slug: model.catalog.slug,
    pageCount: pages.length,
    api,
    pageRef,
    sessionId,
    setPage,
    setReduced,
    setBox,
    onJumpToPage: jumpToPage,
    onStepFlip: (delta) => flipTo(pageRef.current + delta, true),
  });

  function go(delta: number) {
    flipTo(pageRef.current + delta, !box.portrait);
  }
  function turn(index: number) {
    flipTo(index, Math.abs(index - pageRef.current) === 1);
  }
  function openFabric(id: string, variantId?: string) {
    setOpenId(id);
    setOpenVariant(variantId);
    const fabric = model.fabrics.find((item) => item.id === id);
    const url = `/c/${model.catalog.slug}/d/${fabric?.art ?? id}`;
    history.replaceState(null, "", url);
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [{ catalogSlug: model.catalog.slug, type: "fabric_open", fabricId: id, sessionId: sessionId.current, ts: new Date().toISOString() }] }),
    });
  }
  function requestSample(id: string) {
    setRequestId(id);
    setLead(true);
  }
  const results = useMemo(() => searchFabrics(model.fabrics, query), [model.fabrics, query]);
  const opened = model.fabrics.find((fabric) => fabric.id === openId);
  const currentPage = pages[page];
  const sectionLinks = useMemo(() => catalogSectionLinks(model.catalog, pages, lang), [model.catalog, pages, lang]);

  return (
    <div
      ref={root}
      className={`catalog-root relative ${box.mobileFeed ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"}`}
      data-theme={model.catalog.layout.theme}
      style={{ fontSize: box.w / 28 }}
    >
      {sectionLinks.length ? <CatalogSectionJumpBar links={sectionLinks} currentPage={page} onJump={turn} /> : null}
      <div className={box.mobileFeed ? "min-h-0 flex-1" : "flex min-h-screen items-center justify-center pb-24"}>
        {box.mobileFeed && !openId ? (
          <MobileCatalogFeed
            ref={mobileFeedRef}
            model={bookModel}
            pages={pages}
            pageWidth={box.w}
            pageHeight={box.h}
            onPageCommit={onPageCommit}
            onOpen={openFabric}
            onRequest={requestSample}
            onLead={() => setLead(true)}
            onJump={turn}
          />
        ) : reduced && currentPage ? (
          <StaticPage model={bookModel} page={currentPage} index={page} width={box.w} height={box.h} onOpen={openFabric} onRequest={requestSample} onLead={() => setLead(true)} onJump={turn} />
        ) : (
          <FlipSideNav page={page} total={pages.length} portrait={box.portrait} hidden={Boolean(openId) || reduced} onPrev={() => go(-1)} onNext={() => go(1)}>
            <Book model={bookModel} width={box.w} height={box.h} startPage={page} current={page} reduced={reduced} portrait={box.portrait} onFlip={applyPage} onOpen={openFabric} onRequest={requestSample} onLead={() => setLead(true)} onJump={turn} apiRef={api} />
          </FlipSideNav>
        )}
      </div>
      <Toolbar
        page={page + 1}
        total={pages.length}
        langs={model.catalog.langs}
        portrait={box.portrait}
        mobileFeed={box.mobileFeed}
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
          pages={pages}
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
          variantId={openVariant}
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
        setLead={(open) => {
          setLead(open);
          if (!open) setRequestId(undefined);
        }}
        fabricIds={requestId ? [requestId] : cart.length ? cart : openId ? [openId] : []}
        onOpen={openFabric}
        onDone={(text) => {
          setNotice(text);
          setLead(false);
          setRequestId(undefined);
          if (!requestId) setCart([]);
        }}
      />
      {notice ? <p className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 bg-ink px-3 py-2 text-sm text-paper">{notice}</p> : null}
    </div>
  );
}
