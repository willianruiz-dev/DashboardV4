import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:shadow-sm",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:bg-destructive/90 hover:shadow-md active:translate-y-0 active:shadow-sm",
        detail: "border border-action-muted-border bg-action-muted text-action-muted-foreground shadow-sm hover:-translate-y-px hover:bg-action-muted-hover hover:shadow-md active:translate-y-0 active:shadow-sm",
        success: "border border-success-border bg-success-surface text-success-foreground shadow-sm hover:-translate-y-px hover:bg-success-surface-hover hover:shadow-md active:translate-y-0 active:shadow-sm",
        outline: "border border-input bg-card text-foreground shadow-sm hover:-translate-y-px hover:bg-secondary hover:text-secondary-foreground hover:shadow-md active:translate-y-0 active:shadow-sm",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-px hover:bg-secondary/80 hover:shadow-md active:translate-y-0 active:shadow-sm",
        ghost: "text-foreground hover:bg-secondary hover:text-secondary-foreground",
        link: "h-auto min-h-0 px-0 py-0 text-primary underline-offset-4 hover:underline",
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
