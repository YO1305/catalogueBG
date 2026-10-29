"use client";

import { useEffect, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { PageBack } from "@/components/flipbook/PageBack";
import { PageCover } from "@/components/flipbook/PageCover";
import { PageDesigns } from "@/components/flipbook/PageDesigns";
import { PageSection } from "@/components/flipbook/PageSection";
import { PaperPage } from "@/components/flipbook/PaperPage";
import type { BuiltPage, Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

type FlipHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (page: number) => void;
  };
};

const Flip = HTMLFlipBook as unknown as React.ForwardRefExoticComponent<
  React.PropsWithChildren<{
    className: string;
    style: React.CSSProperties;
    width: number;
    height: number;
    size: "fixed";
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    startZIndex: number;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    clickEventForward: boolean;
    useMouseEvents: boolean;
    swipeDistance: number;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
    startPage: number;
    onFlip: (event: { data: number }) => void;
  }> &
    React.RefAttributes<FlipHandle>
>;

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
  onJump,
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
  apiRef: React.RefObject<FlipHandle | null>;
}) {
  const ref = useRef<FlipHandle>(null);
  useEffect(() => {
    apiRef.current = ref.current;
  });
  const byId = new Map(model.fabrics.map((fabric) => [fabric.id, fabric]));
  return (
    <Flip
      ref={ref}
      className="flipbook"
      style={{}}
      width={width}
      height={height}
      size="fixed"
      minWidth={240}
      maxWidth={900}
      minHeight={340}
      maxHeight={1300}
      drawShadow={!reduced}
      flippingTime={reduced ? 1 : 1000}
      usePortrait={portrait}
      startZIndex={2}
      autoSize
      maxShadowOpacity={0.35}
      showCover
      mobileScrollSupport
      clickEventForward
      useMouseEvents={false}
      swipeDistance={24}
      showPageCorners={false}
      disableFlipByClick
      startPage={startPage}
      onFlip={(event) => onFlip(event.data)}
    >
      {model.pages.map((page) => (
        <PaperPage key={`${page.kind}-${page.index}`} hard={page.kind === "cover" || page.kind === "back"}>
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
        </PaperPage>
      ))}
    </Flip>
  );
};
