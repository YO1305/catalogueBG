"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { BookModel } from "@/components/flipbook/Book";
import { StaticPage } from "@/components/flipbook/StaticPage";
import type { BuiltPage } from "@/types";

export type MobileCatalogFeedHandle = {
  scrollToPage: (index: number) => void;
};

function activeIndexFromScroll(root: HTMLElement, pageCount: number): number {
  const slide = root.clientHeight;
  if (slide <= 0 || pageCount <= 0) return 0;
  return Math.min(pageCount - 1, Math.max(0, Math.round(root.scrollTop / slide)));
}

export const MobileCatalogFeed = forwardRef<
  MobileCatalogFeedHandle,
  {
    model: BookModel;
    pages: BuiltPage[];
    pageWidth: number;
    pageHeight: number;
    onPageCommit: (index: number) => void;
    onOpen: (id: string, variantId?: string) => void;
    onRequest: (id: string) => void;
    onLead: () => void;
    onJump: (index: number) => void;
  }
>(function MobileCatalogFeed({ model, pages, pageWidth, pageHeight, onPageCommit, onOpen, onRequest, onLead, onJump }, ref) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const committed = useRef(0);
  const commitTimer = useRef<number | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    scrollToPage(index: number) {
      const root = scrollerRef.current;
      if (!root) return;
      const clamped = Math.min(pages.length - 1, Math.max(0, index));
      programmatic.current = true;
      root.scrollTo({ top: clamped * root.clientHeight, behavior: "auto" });
      committed.current = clamped;
      window.setTimeout(() => {
        programmatic.current = false;
      }, 80);
    },
  }));

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    function flushCommit() {
      if (!root || programmatic.current) return;
      const index = activeIndexFromScroll(root, pages.length);
      if (index === committed.current) return;
      committed.current = index;
      onPageCommit(index);
    }

    function onScroll() {
      if (programmatic.current) return;
      window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(flushCommit, 160);
    }

    root.addEventListener("scroll", onScroll, { passive: true });
    if ("onscrollend" in root) {
      root.addEventListener("scrollend", flushCommit, { passive: true });
    }
    return () => {
      root.removeEventListener("scroll", onScroll);
      if ("onscrollend" in root) {
        root.removeEventListener("scrollend", flushCommit);
      }
      window.clearTimeout(commitTimer.current);
    };
  }, [onPageCommit, pages.length]);

  return (
    <div
      ref={scrollerRef}
      className="catalog-mobile-scroller h-[var(--catalog-slide-h)] w-full overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
    >
      {pages.map((built, index) => (
        <div
          key={`${built.kind}-${built.index}`}
          data-page-index={index}
          className="flex h-[var(--catalog-slide-h)] w-full shrink-0 items-center justify-center px-1.5"
        >
          <StaticPage
            model={model}
            page={built}
            index={index}
            width={pageWidth}
            height={pageHeight}
            onOpen={onOpen}
            onRequest={onRequest}
            onLead={onLead}
            onJump={onJump}
          />
        </div>
      ))}
    </div>
  );
});
