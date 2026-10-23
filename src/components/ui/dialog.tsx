"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1c1915]/55" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg bg-paper p-5 shadow-2xl",
          className,
        )}
        {...props}
      >
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function CloseButton() {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-ink/70 hover:bg-black/5" aria-label={t("common.close")}>
      <X className="h-4 w-4" />
    </DialogPrimitive.Close>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-2xl", className)} {...props} />;
}
