"use client";

import { Banknote, CircleDollarSign, Edit3, Eye, KeyRound, Plus, Scale, Settings2, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { ChangePaypadPasswordDialog } from "@/features/paypads/components/change-paypad-password-dialog";
import { PayPadBalanceDialog } from "@/features/paypads/components/paypad-balance-dialog";
import { PayPadConfigurationDialog } from "@/features/paypads/components/paypad-configuration-dialog";
import { PayPadEditorDialog } from "@/features/paypads/components/paypad-editor-dialog";
import { PayPadLoadDialog } from "@/features/paypads/components/paypad-load-dialog";
import { PayPadStorageDialog } from "@/features/paypads/components/paypad-storage-dialog";
import { PayPadTonnageDialog } from "@/features/paypads/components/paypad-tonnage-dialog";
import { useDeletePaypad, usePaypads } from "@/features/paypads/hooks";
import type { PayPad } from "@/features/paypads/schemas";

interface ActionButtonProps {
  "aria-label": string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}

type ActiveDialog =
  | { kind: "balance"; paypad: PayPad }
  | { kind: "change-password"; paypad: PayPad }
  | { kind: "configuration"; paypad: PayPad }
  | { kind: "delete"; paypad: PayPad }
  | { kind: "create" }
  | { kind: "edit"; paypad: PayPad }
  | { kind: "load"; paypad: PayPad }
  | { kind: "storage"; paypad: PayPad }
  | { kind: "tonnage"; paypad: PayPad }
  | null;

function ActionButton({ children, disabled = false, onClick, tooltip, ...props }: ActionButtonProps) {
  return <Tooltip><TooltipTrigger asChild><Button disabled={disabled} onClick={onClick} size="icon" type="button" variant="ghost" {...props}>{children}</Button></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>;
}

function paypadName(paypad: PayPad): string {
  return paypad.username?.trim() || `Pay+ ${paypad.id}`;
}

function PayPadCard({ canDelete, canReadOperations, canWrite, onAction, paypad }: { canDelete: boolean; canReadOperations: boolean; canWrite: boolean; onAction: (dialog: ActiveDialog) => void; paypad: PayPad }) {
  const active = paypad.status === 1;

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><CardTitle className="break-words">{paypadName(paypad)}</CardTitle><CardDescription>ID {paypad.id}</CardDescription></div>
          <Badge variant={active ? "default" : "secondary"}>{active ? "Activo" : "Inactivo"}</Badge>
        </div>
        <p className="min-h-10 text-sm text-muted-foreground">{paypad.description?.trim() || "Sin descripción"}</p>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex items-center gap-2"><Banknote aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{paypad.office?.trim() || `Sucursal ${paypad.idOffice}`}</span></div>
        <div className="flex items-center gap-2"><CircleDollarSign aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{paypad.currency?.trim() || `Moneda ${paypad.idCurrency}`}</span></div>
        <p className="font-numeric text-xs text-muted-foreground">{paypad.latitude && paypad.longitude ? `${paypad.latitude}, ${paypad.longitude}` : "Ubicación no disponible"}</p>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-1 border-t pt-4">
        {canReadOperations ? <>
          <ActionButton aria-label={`Configurar denominaciones de ${paypadName(paypad)}`} onClick={() => onAction({ kind: "storage", paypad })} tooltip="Configurar denominaciones"><Banknote aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Realizar arqueo de ${paypadName(paypad)}`} onClick={() => onAction({ kind: "tonnage", paypad })} tooltip="Realizar arqueo"><Scale aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Registrar cargue de ${paypadName(paypad)}`} onClick={() => onAction({ kind: "load", paypad })} tooltip="Registrar cargue"><CircleDollarSign aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Ver cargues y arqueos de ${paypadName(paypad)}`} onClick={() => onAction({ kind: "balance", paypad })} tooltip="Ver cargues y arqueos"><Eye aria-hidden="true" className="size-4" /></ActionButton>
        </> : null}
        {canWrite ? <>
          <ActionButton aria-label={`Configurar ${paypadName(paypad)}`} onClick={() => onAction({ kind: "configuration", paypad })} tooltip="Configuración técnica"><Settings2 aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Cambiar contraseña de ${paypadName(paypad)}`} onClick={() => onAction({ kind: "change-password", paypad })} tooltip="Cambiar contraseña"><KeyRound aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Editar ${paypadName(paypad)}`} onClick={() => onAction({ kind: "edit", paypad })} tooltip="Editar Pay+"><Edit3 aria-hidden="true" className="size-4" /></ActionButton>
        </> : null}
        {canDelete ? <ActionButton aria-label={`Eliminar ${paypadName(paypad)}`} onClick={() => onAction({ kind: "delete", paypad })} tooltip="Eliminar Pay+"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></ActionButton> : null}
      </CardFooter>
    </Card>
  );
}

export function PaypadsPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadPayPads");
  const canWrite = hasPermission(session, "WritePayPads");
  const canDelete = hasPermission(session, "DelPayPads");
  const canReadOperations = hasPermission(session, "ReadTonnagesAndLoads");
  const paypadsQuery = usePaypads(canRead);
  const deleteMutation = useDeletePaypad();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayPad | null>(null);
  const paypads = paypadsQuery.data ?? [];

  function selectAction(dialog: ActiveDialog): void {
    if (dialog?.kind === "delete") {
      setDeleteTarget(dialog.paypad);
      return;
    }
    setActiveDialog(dialog);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Pay+ eliminado.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el Pay+.");
    }
  }

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader actions={canWrite ? <Button onClick={() => setActiveDialog({ kind: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear Pay+</Button> : undefined} description="Administra los equipos Pay+, sus denominaciones, movimientos y configuración operativa." title="Pay+" />
      {paypadsQuery.isPending ? <ListSkeleton rows={8} /> : null}
      {!paypadsQuery.isPending && paypadsQuery.isError ? <ErrorState description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar los Pay+."} onRetry={() => void paypadsQuery.refetch()} /> : null}
      {!paypadsQuery.isPending && !paypadsQuery.isError && paypads.length === 0 ? <EmptyState description="Crea el primer equipo Pay+ para iniciar su configuración." title="No hay Pay+ registrados" /> : null}
      {!paypadsQuery.isPending && !paypadsQuery.isError && paypads.length > 0 ? <div aria-label="Listado de Pay+" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{paypads.map((paypad) => <PayPadCard canDelete={canDelete} canReadOperations={canReadOperations} canWrite={canWrite} key={paypad.id} onAction={selectAction} paypad={paypad} />)}</div> : null}

      {activeDialog?.kind === "create" ? <PayPadEditorDialog mode="create" onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open /> : null}
      {activeDialog?.kind === "edit" ? <PayPadEditorDialog mode="edit" onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypadId={activeDialog.paypad.id} /> : null}
      {activeDialog?.kind === "change-password" ? <ChangePaypadPasswordDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypadId={activeDialog.paypad.id} username={activeDialog.paypad.username} /> : null}
      {activeDialog?.kind === "storage" ? <PayPadStorageDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypad={activeDialog.paypad} /> : null}
      {activeDialog?.kind === "load" ? <PayPadLoadDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypad={activeDialog.paypad} /> : null}
      {activeDialog?.kind === "tonnage" ? <PayPadTonnageDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypad={activeDialog.paypad} /> : null}
      {activeDialog?.kind === "balance" ? <PayPadBalanceDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypad={activeDialog.paypad} /> : null}
      {activeDialog?.kind === "configuration" ? <PayPadConfigurationDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypad={activeDialog.paypad} /> : null}
      <DestructiveConfirmationDialog
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteTarget(null); }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${paypadName(deleteTarget)} (ID ${deleteTarget.id})` : "el Pay+ seleccionado"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
