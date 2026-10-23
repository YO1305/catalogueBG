"use client";

import { forwardRef } from "react";

export const PaperPage = forwardRef<HTMLDivElement, { hard?: boolean; children: React.ReactNode }>(function PaperPage({ hard, children }, ref) {
  return (
    <article ref={ref} data-density={hard ? "hard" : "soft"} className="paper-page h-full w-full overflow-hidden">
      {children}
    </article>
  );
});
