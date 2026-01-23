"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "neu-badge",
        primary: "neu-badge neu-badge-primary",
        success: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        warning: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
        danger: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
        info: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
        outline: "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-transparent",
        secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        destructive: "bg-rose-600/20 text-rose-700 dark:text-rose-300 border border-rose-500/30",
        error: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
