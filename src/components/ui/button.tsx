import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-blue-500/30 hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-lg hover:shadow-red-500/30 hover:brightness-105",
        outline:
          "border border-input bg-background text-foreground hover:border-slate-400/60 hover:bg-slate-50 hover:shadow-sm dark:hover:bg-slate-800/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-sm",
        ghost:
          "text-foreground hover:bg-secondary hover:text-secondary-foreground",
        link:
          "h-auto min-h-0 px-0 py-0 text-primary underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-b from-emerald-300 to-emerald-400 text-emerald-950 shadow-sm ring-1 ring-inset ring-emerald-500/20 hover:glow-emerald hover:from-emerald-200 hover:to-emerald-300 dark:from-emerald-300 dark:to-emerald-400",
        detail:
          "border border-gray-400/40 bg-gray-400/15 text-gray-700 hover:border-gray-400/70 hover:bg-gray-400/30 hover:text-gray-900 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.25)] dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-300 dark:hover:bg-slate-500/25 dark:hover:text-slate-100",
      },
      size: {
        default: "min-w-11",
        sm: "min-w-11 px-3",
        lg: "min-w-11 px-6 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ size, variant, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
