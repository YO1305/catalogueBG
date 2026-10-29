"use client";

import { useEffect, type RefObject } from "react";

type FlipApi = { pageFlip: () => { turnToPage: (page: number) => void; flipNext: () => void; flipPrev: () => void } };

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
}: {
  slug: string;
  pageCount: number;
  api: RefObject<FlipApi | null>;
  pageRef: { current: number };
  sessionId: { current: string };
  setPage: (index: number) => void;
  setReduced: (value: boolean) => void;
  setBox: (box: { w: number; h: number; portrait: boolean }) => void;
  onStepFlip: (delta: number) => void;
}) {
  useEffect(() => {
    const hash = window.location.hash.match(/^#p(\d+)$/);
    if (hash) {
      const index = Math.min(pageCount - 1, Math.max(0, Number(hash[1]) - 1));
      pageRef.current = index;
      setPage(index);
      api.current?.pageFlip().turnToPage(index);
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
      const portrait = window.innerWidth < 1024;
      const toolbarReserve = portrait ? 128 : 108;
      const maxH = window.innerHeight - toolbarReserve;
      const maxW = portrait ? window.innerWidth - 20 : (window.innerWidth - 48 - 200) / 2;
      let height = maxH;
      let width = height / 1.414;
      if (width > maxW) {
        width = maxW;
        height = width * 1.414;
      }
      const minW = portrait ? 260 : 240;
      const minH = portrait ? 368 : 340;
      setBox({ w: Math.max(minW, Math.floor(width)), h: Math.max(minH, Math.floor(height)), portrait });
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
      if (queue.length) void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: queue }) });
    };
  }, [api, onStepFlip, pageCount, pageRef, sessionId, setBox, setPage, setReduced, slug]);
}
