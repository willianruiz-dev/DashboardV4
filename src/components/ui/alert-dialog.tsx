"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { LoaderCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogAction = AlertDialogPrimitive.Action;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;

const AlertDialogOverlay = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm", className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(
  ({ className, onEscapeKeyDown, ...props }, ref) => (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 grid h-[100dvh] w-full gap-4 overflow-y-auto bg-background p-5 text-foreground sm:inset-x-4 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:-translate-y-1/2 sm:rounded-lg sm:border sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2",
          className,
        )}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        {...props}
      />
    </AlertDialogPortal>
  ),
);
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

export interface CriticalConfirmationDialogProps {
  confirmationLabel: string;
  description: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pendingLabel?: string;
  title: string;
  verificationText: string;
}

function CriticalConfirmationDialog(props: CriticalConfirmationDialogProps) {
  return <CriticalConfirmationDialogContent key={`${props.open}-${props.verificationText}`} {...props} />;
}

function CriticalConfirmationDialogContent({
  confirmationLabel,
  description,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  pendingLabel = "Procesando…",
  title,
  verificationText,
}: CriticalConfirmationDialogProps) {
  const [typedVerification, setTypedVerification] = React.useState("");
  const mayConfirm = !isPending && typedVerification === verificationText;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Escribe <span className="font-numeric font-semibold">{verificationText}</span> para continuar
          <Input
            autoComplete="off"
            disabled={isPending}
            onChange={(event) => setTypedVerification(event.target.value)}
            value={typedVerification}
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button autoFocus disabled={isPending} type="button" variant="outline">
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button disabled={!mayConfirm} onClick={onConfirm} type="button">
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? pendingLabel : confirmationLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface DestructiveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;
  confirmationLabel?: string;
  pendingLabel?: string;
  verificationText?: string;
}

function DestructiveConfirmationDialog(props: DestructiveConfirmationDialogProps) {
  return <DestructiveConfirmationDialogContent key={String(props.open)} {...props} />;
}

function DestructiveConfirmationDialogContent({
  confirmationLabel = "Eliminar definitivamente",
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  pendingLabel = "Procesando…",
  recordLabel,
  title = "Confirmar eliminación irreversible",
  verificationText,
}: DestructiveConfirmationDialogProps) {
  const [typedVerification, setTypedVerification] = React.useState("");
  const requiresVerification = verificationText !== undefined;
  const mayConfirm = !isPending && (!requiresVerification || typedVerification === verificationText);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar <strong className="font-semibold text-foreground">{recordLabel}</strong>. Esta acción es
            irreversible y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requiresVerification ? (
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Escribe <span className="font-numeric font-semibold">{verificationText}</span> para continuar
            <Input
              autoComplete="off"
              disabled={isPending}
              onChange={(event) => setTypedVerification(event.target.value)}
              value={typedVerification}
            />
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button autoFocus disabled={isPending} type="button" variant="outline">
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button disabled={!mayConfirm} onClick={onConfirm} type="button" variant="destructive">
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? pendingLabel : confirmationLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
  CriticalConfirmationDialog,
  DestructiveConfirmationDialog,
};
