import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-lime-300 text-green-950 hover:bg-lime-400",
      destructive: "bg-red-700 text-white hover:bg-red-800",
      outline: "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
      ghost: "text-neutral-600 hover:bg-neutral-100",
    },
    size: {
      default: "min-h-10 rounded px-4 text-xs",
      sm: "min-h-8 rounded px-3 text-xs",
      icon: "size-8 rounded",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
