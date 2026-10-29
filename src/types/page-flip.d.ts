declare module "page-flip/dist/js/page-flip.module.js" {
  export type PageFlipEvent = { data: number };

  export class PageFlip {
    constructor(
      element: HTMLElement,
      settings: {
        width: number;
        height: number;
        size?: "fixed" | "stretch";
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
        drawShadow?: boolean;
        flippingTime?: number;
        usePortrait?: boolean;
        startZIndex?: number;
        autoSize?: boolean;
        maxShadowOpacity?: number;
        showCover?: boolean;
        mobileScrollSupport?: boolean;
        swipeDistance?: number;
        clickEventForward?: boolean;
        useMouseEvents?: boolean;
        showPageCorners?: boolean;
        disableFlipByClick?: boolean;
        startPage?: number;
      },
    );
    loadFromHTML(pages: HTMLElement[]): void;
    on(event: "flip", handler: (event: PageFlipEvent) => void): void;
    off(event: "flip"): void;
    destroy(): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
  }
}
