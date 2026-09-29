import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-[38px] w-full rounded border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-800 outline-none placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-green-700/20", className)} {...props} />;
}
