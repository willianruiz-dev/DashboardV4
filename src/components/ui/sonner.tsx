"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      closeButton
      toastOptions={{
        classNames: {
          closeButton: "border-border bg-background text-foreground hover:bg-secondary",
          description: "text-muted-foreground",
          toast: "border-border bg-popover text-popover-foreground",
          title: "text-popover-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
