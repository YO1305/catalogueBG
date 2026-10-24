"use client";

import type { BookModel } from "@/components/flipbook/Book";
import { PageBack } from "@/components/flipbook/PageBack";
import { PageCover } from "@/components/flipbook/PageCover";
import { PageDesigns } from "@/components/flipbook/PageDesigns";
import { PageSection } from "@/components/flipbook/PageSection";
import { PageToc } from "@/components/flipbook/PageToc";
import type { BuiltPage } from "@/types";

export function StaticPage({
  model,
  page,
  index,
  width,
  height,
  onOpen,
  onLead,
  onJump,
}: {
  model: BookModel;
  page: BuiltPage;
  index: number;
  width: number;
  height: number;
  onOpen: (id: string) => void;
  onLead: () => void;
  onJump: (index: number) => void;
}) {
  const byId = new Map(model.fabrics.map((fabric) => [fabric.id, fabric]));
  return (
    <div className="paper-page shadow-2xl" style={{ width, height }}>
      {page.kind === "cover" ? <PageCover catalog={model.catalog} count={model.fabrics.length} /> : null}
      {page.kind === "toc" ? <PageToc catalog={model.catalog} page={page} fabricTypes={model.fabricTypes} collections={model.collections} fabrics={model.fabrics} onJump={onJump} /> : null}
      {page.kind === "section" ? <PageSection page={page} fabricTypes={model.fabricTypes} collections={model.collections} /> : null}
      {page.kind === "designs" ? (
        <PageDesigns
          catalog={model.catalog}
          fabrics={page.fabricIds.flatMap((id) => {
            const fabric = byId.get(id);
            return fabric ? [fabric] : [];
          })}
          fabricTypes={model.fabricTypes}
          pageNumber={index + 1}
          active
          onOpen={onOpen}
        />
      ) : null}
      {page.kind === "back" ? <PageBack catalog={model.catalog} qr={model.qr} onLead={onLead} /> : null}
    </div>
  );
}
