"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

type FlipApi = { pageFlip: () => { turnToPage: (page: number) => void; flipNext: () => void; flipPrev: () => void } };

export type CatalogBox = { w: number; h: number; portrait: boolean };

export type CatalogTrackPayload = {
  type: "open" | "page" | "fabric_open" | "zoom" | "share" | "pdf" | "lead";
  fabricId?: string;
  page?: number;
};

function measureBox(): CatalogBox {
  const portrait = window.innerWidth < 768;
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
  return { w: Math.max(minW, Math.floor(width)), h: Math.max(minH, Math.floor(height)), portrait };
}

function sameBox(a: CatalogBox, b: CatalogBox) {
  return a.w === b.w && a.h === b.h && a.portrait === b.portrait;
}

function flushEvents(events: Array<Record<string, string | number | undefined>>, beacon: boolean) {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  if (beacon && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }))) return;
  }
  void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: beacon });
}

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
  setBox: (box: CatalogBox) => void;
  onStepFlip: (delta: number) => void;
}) {
  const onStepFlipRef = useRef(onStepFlip);
  onStepFlipRef.current = onStepFlip;
  const setBoxRef = useRef(setBox);
  setBoxRef.current = setBox;
  const boxRef = useRef<CatalogBox | null>(null);
  const queueRef = useRef<Array<Record<string, string | number | undefined>>>([]);

  const track = useCallback(
    (payload: CatalogTrackPayload) => {
      queueRef.current.push({
        catalogSlug: slug,
        sessionId: sessionId.current,
        ts: new Date().toISOString(),
        ...payload,
      });
    },
    [slug, sessionId],
  );

  useEffect(() => {
    const hash = window.location.hash.match(/^#p(\d+)$/);
    if (hash) {
      const index = Math.min(pageCount - 1, Math.max(0, Number(hash[1]) - 1));
      pageRef.current = index;
      setPage(index);
      api.current?.pageFlip().turnToPage(index);
    }
  }, [api, pageCount, pageRef, setPage]);

  useEffect(() => {
    sessionId.current = sessionStorage.getItem("bahmal-session") || crypto.randomUUID();
    sessionStorage.setItem("bahmal-session", sessionId.current);
    queueRef.current.push({ catalogSlug: slug, type: "open", sessionId: sessionId.current, ts: new Date().toISOString() });
    const flush = (beacon: boolean) => {
      if (!queueRef.current.length) return;
      flushEvents(queueRef.current.splice(0, 20), beacon);
    };
    const timer = window.setInterval(() => flush(false), 60_000);
    const onHide = () => flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sessionId, slug]);

  useEffect(() => {
    const measure = () => {
      const next = measureBox();
      const prev = boxRef.current;
      if (prev && sameBox(prev, next)) return;
      boxRef.current = next;
      setBoxRef.current(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      onStepFlipRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [setReduced]);

  return track;
}
