"use client";

import { useEffect, useRef } from "react";
import { PageFlip } from "page-flip/dist/js/page-flip.module.js";
import { PageBack } from "@/components/flipbook/PageBack";
import { PageCover } from "@/components/flipbook/PageCover";
import { PageDesigns } from "@/components/flipbook/PageDesigns";
import { PageSection } from "@/components/flipbook/PageSection";
import type { BuiltPage, Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

type FlipApi = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (page: number) => void;
  };
};

export type BookModel = {
  catalog: Catalog;
  fabrics: Fabric[];
  pages: BuiltPage[];
  fabricTypes: FabricType[];
  collections: Collection[];
  productTypes: ProductType[];
  coverImage?: string;
  qr: string;
};

export const Book = function Book({
  model,
  width,
  height,
  startPage,
  current,
  reduced,
  portrait,
  onFlip,
  onOpen,
  onRequest,
  onLead,
  apiRef,
}: {
  model: BookModel;
  width: number;
  height: number;
  startPage: number;
  current: number;
  reduced: boolean;
  portrait: boolean;
  onFlip: (index: number) => void;
  onOpen: (id: string, variantId?: string) => void;
  onRequest: (id: string) => void;
  onLead: () => void;
  onJump: (index: number) => void;
  apiRef: React.RefObject<FlipApi | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const onFlipRef = useRef(onFlip);
  const startPageRef = useRef(startPage);
  onFlipRef.current = onFlip;
  startPageRef.current = startPage;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || width < 40 || height < 40) return;

    const nodes = [...root.querySelectorAll<HTMLElement>("[data-flip-page]")];
    if (nodes.length < 1) return;

    const flip = new PageFlip(root, {
      width,
      height,
      size: "fixed",
      minWidth: width,
      maxWidth: width,
      minHeight: height,
      maxHeight: height,
      drawShadow: !reduced,
      flippingTime: reduced ? 1 : 700,
      usePortrait: portrait,
      startZIndex: 2,
      autoSize: false,
      maxShadowOpacity: 0.35,
      showCover: true,
      mobileScrollSupport: portrait,
      swipeDistance: 24,
      clickEventForward: true,
      useMouseEvents: false,
      showPageCorners: false,
      disableFlipByClick: true,
      startPage: Math.min(Math.max(0, startPageRef.current), nodes.length - 1),
    });

    flip.loadFromHTML(nodes);
    flip.on("flip", (event: { data: number }) => {
      onFlipRef.current(event.data);
    });

    flipRef.current = flip;
    apiRef.current = {
      pageFlip: () => ({
        flipNext: () => flip.flipNext(),
        flipPrev: () => flip.flipPrev(),
        turnToPage: (page: number) => flip.turnToPage(page),
      }),
    };

    return () => {
      try {
        flip.destroy();
      } catch {
        /* ignore */
      }
      flipRef.current = null;
      apiRef.current = null;
    };
  }, [apiRef, height, model.pages.length, portrait, reduced, width]);

  const byId = new Map(model.fabrics.map((fabric) => [fabric.id, fabric]));

  return (
    <div
      ref={rootRef}
      className="flipbook"
      style={{ width: portrait ? width : width * 2, height }}
    >
      {model.pages.map((page) => (
        <div
          key={`${page.kind}-${page.index}`}
          data-flip-page
          data-density={page.kind === "cover" || page.kind === "back" ? "hard" : "soft"}
          className="paper-page overflow-hidden"
          style={{ width, height }}
        >
          {page.kind === "cover" ? <PageCover catalog={model.catalog} coverImage={model.coverImage} /> : null}
          {page.kind === "section" ? <PageSection page={page} catalog={model.catalog} fabricTypes={model.fabricTypes} collections={model.collections} /> : null}
          {page.kind === "designs" ? (
            <PageDesigns
              catalog={model.catalog}
              fabrics={page.fabricIds.flatMap((id) => {
                const fabric = byId.get(id);
                return fabric ? [fabric] : [];
              })}
              fabricTypes={model.fabricTypes}
              pageNumber={page.index + 1}
              active={Math.abs(page.index - current) <= 5}
              onOpen={onOpen}
              onRequest={onRequest}
            />
          ) : null}
          {page.kind === "back" ? <PageBack catalog={model.catalog} onLead={onLead} /> : null}
        </div>
      ))}
    </div>
  );
};
