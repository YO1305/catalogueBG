import type { MouseEvent, TouchEvent } from "react";

/** Не отдавать mousedown/touchstart библиотеке page-flip (иначе клик по фото = перелистывание). */
export function shieldFlipPointer(event: MouseEvent | TouchEvent) {
  event.stopPropagation();
}
