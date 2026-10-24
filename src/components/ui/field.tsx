import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, ChevronDown, Search } from "lucide-react";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "rounded-lg border border-black/10 bg-white text-sm leading-normal text-ink shadow-sm outline-none transition-colors placeholder:text-ink/40 hover:border-black/20 focus:border-majolica focus:ring-2 focus:ring-majolica/15 disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10 w-full px-3", className)} {...props} />;
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
      <input type="search" className={cn(control, "h-10 w-full pl-9 pr-3")} {...props} />
    </div>
  );
}

/** Native select without browser chrome, so the label stays vertically centred in Safari and iOS. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(control, "h-10 w-full cursor-pointer appearance-none truncate py-0 pl-3 pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" aria-hidden />
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 w-full px-3 py-2", className)} {...props} />;
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
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[0.6875rem] font-medium leading-none", tones[tone])}>{children}</span>;
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
