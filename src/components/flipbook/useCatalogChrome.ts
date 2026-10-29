"use client";

import { useEffect, type RefObject } from "react";

type FlipApi = { pageFlip: () => { turnToPage: (page: number) => void; flipNext: () => void; flipPrev: () => void } };

export type CatalogViewport = { w: number; h: number; portrait: boolean; mobileFeed: boolean };

export function useCatalogChrome({
  slug,
  pageCount,
  api,
  pageRef,
  sessionId,
  setPage,
  setReduced,
  setBox,
  onStepFlip,
  onJumpToPage,
}: {
  slug: string;
  pageCount: number;
  api: RefObject<FlipApi | null>;
  pageRef: { current: number };
  sessionId: { current: string };
  setPage: (index: number) => void;
  setReduced: (value: boolean) => void;
  setBox: (box: CatalogViewport) => void;
  onStepFlip: (delta: number) => void;
  onJumpToPage?: (index: number) => void;
}) {
  useEffect(() => {
    const hash = window.location.hash.match(/^#p(\d+)$/);
    if (hash) {
      const index = Math.min(pageCount - 1, Math.max(0, Number(hash[1]) - 1));
      pageRef.current = index;
      setPage(index);
      if (onJumpToPage) onJumpToPage(index);
      else api.current?.pageFlip()?.turnToPage(index);
    }
    sessionId.current = sessionStorage.getItem("bahmal-session") || crypto.randomUUID();
    sessionStorage.setItem("bahmal-session", sessionId.current);
    const queue: Array<Record<string, string | number | undefined>> = [];
    queue.push({ catalogSlug: slug, type: "open", sessionId: sessionId.current, ts: new Date().toISOString() });
    const timer = window.setInterval(() => {
      if (!queue.length) return;
      const events = queue.splice(0, 20);
      void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events }) });
    }, 4000);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    const measure = () => {
      const mobileFeed = window.matchMedia("(max-width: 767px)").matches;
      if (mobileFeed) {
        document.documentElement.classList.add("catalog-mobile-feed");
        const toolbarReserve = 52;
        const slideH = window.innerHeight - toolbarReserve;
        const width = Math.min(window.innerWidth - 12, slideH / 1.414);
        const height = width * 1.414;
        setBox({
          w: Math.max(280, Math.floor(width)),
          h: Math.max(396, Math.floor(height)),
          portrait: true,
          mobileFeed: true,
        });
        return;
      }
      document.documentElement.classList.remove("catalog-mobile-feed");
      const toolbarReserve = 108;
      const maxH = window.innerHeight - toolbarReserve;
      const maxW = (window.innerWidth - 48 - 200) / 2;
      let height = maxH;
      let width = height / 1.414;
      if (width > maxW) {
        width = maxW;
        height = width * 1.414;
      }
      setBox({
        w: Math.max(240, Math.floor(width)),
        h: Math.max(340, Math.floor(height)),
        portrait: false,
        mobileFeed: false,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      onStepFlip(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      media.removeEventListener("change", apply);
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("catalog-mobile-feed");
      if (queue.length) void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: queue }) });
    };
  }, [api, onJumpToPage, onStepFlip, pageCount, pageRef, sessionId, setBox, setPage, setReduced, slug]);
}
