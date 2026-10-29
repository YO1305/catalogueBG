"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { BookModel } from "@/components/flipbook/Book";
import { StaticPage } from "@/components/flipbook/StaticPage";
import type { BuiltPage } from "@/types";

export type MobileCatalogFeedHandle = {
  scrollToPage: (index: number) => void;
};

export const MobileCatalogFeed = forwardRef<
  MobileCatalogFeedHandle,
  {
    model: BookModel;
    pages: BuiltPage[];
    pageWidth: number;
    pageHeight: number;
    onPageVisible: (index: number) => void;
    onOpen: (id: string, variantId?: string) => void;
    onRequest: (id: string) => void;
    onLead: () => void;
    onJump: (index: number) => void;
  }
>(function MobileCatalogFeed({ model, pages, pageWidth, pageHeight, onPageVisible, onOpen, onRequest, onLead, onJump }, ref) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const visibleRef = useRef(0);

  useImperativeHandle(ref, () => ({
    scrollToPage(index: number) {
      const root = scrollerRef.current;
      if (!root) return;
      const target = root.querySelector(`[data-page-index="${index}"]`);
      if (!target) return;
      programmatic.current = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        programmatic.current = false;
      }, 480);
    },
  }));

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmatic.current) return;
        let bestIndex = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (!Number.isFinite(index)) continue;
          if (entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        }
        if (bestIndex >= 0 && bestRatio >= 0.45 && bestIndex !== visibleRef.current) {
          visibleRef.current = bestIndex;
          onPageVisible(bestIndex);
        }
      },
      { root, threshold: [0.45, 0.6, 0.75, 0.9] },
    );
    root.querySelectorAll("[data-page-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [onPageVisible, pages]);

  return (
    <div
      ref={scrollerRef}
      className="catalog-mobile-scroller h-[var(--catalog-slide-h)] w-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain"
    >
      {pages.map((built, index) => (
        <div
          key={`${built.kind}-${built.index}`}
          data-page-index={index}
          className="flex h-[var(--catalog-slide-h)] w-full shrink-0 snap-start snap-always items-center justify-center px-1.5"
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
