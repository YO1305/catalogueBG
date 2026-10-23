import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-majolica", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-majolica", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-xs font-medium uppercase tracking-wide text-ink/60", className)} {...props} />;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "gold" | "ok" | "warn" }) {
  const tones = {
    default: "bg-sand text-ink",
    gold: "bg-gold/20 text-[#6d5420]",
    ok: "bg-emerald-100 text-emerald-900",
    warn: "bg-amber-100 text-amber-950",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", tones[tone])}>{children}</span>;
}

export function Checkbox({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="flex h-4 w-4 items-center justify-center rounded border border-ink/30 bg-white"
      >
        <CheckboxPrimitive.Indicator>
          <Check className="h-3 w-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  );
}
