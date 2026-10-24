import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium leading-none transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-majolica text-paper shadow-sm hover:bg-[#0f2c4e]",
        gold: "bg-gold text-ink shadow-sm hover:bg-[#8d6e2e]",
        outline: "border border-black/10 bg-white text-ink shadow-sm hover:border-black/20 hover:bg-[#faf8f4]",
        ghost: "text-ink hover:bg-black/5",
        danger: "bg-red-800 text-white shadow-sm hover:bg-red-900",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-9 px-3.5 text-[0.8125rem]",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
