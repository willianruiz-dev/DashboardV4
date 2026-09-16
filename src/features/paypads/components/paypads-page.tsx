"use client";

import { Banknote, Building2, CircleDollarSign, Edit3, Eye, KeyRound, MapPin, Plus, Scale, Search, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useOffices } from "@/features/offices/hooks";
import type { DashboardOffice } from "@/features/offices/schemas";
import { ChangePaypadPasswordDialog } from "@/features/paypads/components/change-paypad-password-dialog";
import { PayPadBalanceDialog } from "@/features/paypads/components/paypad-balance-dialog";
import { PayPadConfigurationDialog } from "@/features/paypads/components/paypad-configuration-dialog";
import { PayPadEditorDialog } from "@/features/paypads/components/paypad-editor-dialog";
import { PayPadLoadDialog } from "@/features/paypads/components/paypad-load-dialog";
import { PayPadStorageDialog } from "@/features/paypads/components/paypad-storage-dialog";
import { PayPadTonnageDialog } from "@/features/paypads/components/paypad-tonnage-dialog";
import { useDeletePaypad, usePaypads } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
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

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function matchesPaypadFilter(
  paypad: PayPad,
  office: DashboardOffice | undefined,
  query: string,
  status: "active" | "all" | "inactive",
): boolean {
  if (status === "active" && paypad.status !== 1) {
    return false;
  }

  if (status === "inactive" && paypad.status === 1) {
    return false;
  }

  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length === 0) {
    return true;
  }

  const searchableValues = [
    String(paypad.id),
    getPaypadDisplayName(paypad),
    paypad.description ?? "",
    paypad.office ?? "",
    office?.name ?? "",
    office?.address ?? "",
    paypad.currency ?? "",
    String(paypad.idOffice),
  ];

  return searchableValues.some((value) => normalizeSearch(value).includes(normalizedQuery));
}

function PayPadCard({
  canDelete,
  canReadOperations,
  canWrite,
  office,
  onAction,
  paypad,
}: {
  canDelete: boolean;
  canReadOperations: boolean;
  canWrite: boolean;
  office: DashboardOffice | undefined;
  onAction: (dialog: ActiveDialog) => void;
  paypad: PayPad;
}) {
  const active = paypad.status === 1;
  const officeName = office?.name?.trim() || paypad.office?.trim() || `Sucursal ${paypad.idOffice}`;
  const officeAddress = office?.address?.trim() || "Dirección no disponible";

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{getPaypadDisplayName(paypad)}</CardTitle>
            <CardDescription>ID {paypad.id}</CardDescription>
          </div>
          <Badge variant={active ? "default" : "secondary"}>{active ? "Activo" : "Inactivo"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Building2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{officeName}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">{officeAddress}</span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-1 border-t pt-4">
        {canReadOperations ? <>
          <ActionButton aria-label={`Configurar denominaciones de ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "storage", paypad })} tooltip="Configurar denominaciones"><Banknote aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Realizar arqueo de ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "tonnage", paypad })} tooltip="Realizar arqueo"><Scale aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Registrar cargue de ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "load", paypad })} tooltip="Registrar cargue"><CircleDollarSign aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Ver cargues y arqueos de ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "balance", paypad })} tooltip="Ver cargues y arqueos"><Eye aria-hidden="true" className="size-4" /></ActionButton>
        </> : null}
        {canWrite ? <>
          <ActionButton aria-label={`Configurar ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "configuration", paypad })} tooltip="Configuración técnica"><Settings2 aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Cambiar contraseña de ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "change-password", paypad })} tooltip="Cambiar contraseña"><KeyRound aria-hidden="true" className="size-4" /></ActionButton>
          <ActionButton aria-label={`Editar ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "edit", paypad })} tooltip="Editar Pay+"><Edit3 aria-hidden="true" className="size-4" /></ActionButton>
        </> : null}
        {canDelete ? <ActionButton aria-label={`Eliminar ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "delete", paypad })} tooltip="Eliminar Pay+"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></ActionButton> : null}
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
  const officesQuery = useOffices(canRead);
  const deleteMutation = useDeletePaypad();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayPad | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "inactive">("all");
  const paypads = useMemo(() => paypadsQuery.data ?? [], [paypadsQuery.data]);
  const officesById = useMemo(() => new Map((officesQuery.data ?? []).map((office) => [office.id, office] as const)), [officesQuery.data]);
  const filteredPaypads = useMemo(
    () => paypads.filter((paypad) => matchesPaypadFilter(paypad, officesById.get(paypad.idOffice), searchQuery, statusFilter)),
    [officesById, paypads, searchQuery, statusFilter],
  );

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
      <PageHeader
        actions={canWrite ? <Button onClick={() => setActiveDialog({ kind: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear Pay+</Button> : undefined}
        description="Administra los equipos Pay+, sus denominaciones, movimientos y configuración operativa."
        title="Pay+"
      />
      {paypadsQuery.isPending ? <ListSkeleton rows={8} /> : null}
      {!paypadsQuery.isPending && paypadsQuery.isError ? (
        <ErrorState
          description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar los Pay+."}
          onRetry={() => void paypadsQuery.refetch()}
        />
      ) : null}
      {!paypadsQuery.isPending && !paypadsQuery.isError && paypads.length === 0 ? (
        <EmptyState description="Crea el primer equipo Pay+ para iniciar su configuración." title="No hay Pay+ registrados" />
      ) : null}
      {!paypadsQuery.isPending && !paypadsQuery.isError && paypads.length > 0 ? (
        <>
          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
              <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="paypad-search">
                Buscar equipos Pay+
                <span className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-describedby="paypad-filter-count"
                    id="paypad-search"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Nombre, ID, sucursal, moneda o descripción"
                    value={searchQuery}
                  />
                </span>
              </label>
              <div className="grid gap-2 text-sm font-medium text-foreground">
                <span id="paypad-status-filter-label">Estado</span>
                <Select onValueChange={(value) => setStatusFilter(value as "active" | "all" | "inactive")} value={statusFilter}>
                  <SelectTrigger aria-labelledby="paypad-status-filter-label" id="paypad-status-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground md:col-span-2" id="paypad-filter-count" role="status">
                {filteredPaypads.length} de {paypads.length} equipo{paypads.length === 1 ? "" : "s"} Pay+.
              </p>
            </CardContent>
          </Card>
          {filteredPaypads.length === 0 ? (
            <EmptyState description="Cambia el texto o el estado para encontrar otro equipo." title="No hay equipos que coincidan con el filtro" />
          ) : (
            <div aria-label="Listado de Pay+ filtrado" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredPaypads.map((paypad) => (
                <PayPadCard
                  canDelete={canDelete}
                  canReadOperations={canReadOperations}
                  canWrite={canWrite}
                  key={paypad.id}
                  office={officesById.get(paypad.idOffice)}
                  onAction={selectAction}
                  paypad={paypad}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {activeDialog?.kind === "create" ? <PayPadEditorDialog mode="create" onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open /> : null}
      {activeDialog?.kind === "edit" ? <PayPadEditorDialog mode="edit" onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypadId={activeDialog.paypad.id} /> : null}
      {activeDialog?.kind === "change-password" ? <ChangePaypadPasswordDialog onOpenChange={(open) => { if (!open) setActiveDialog(null); }} open paypadId={activeDialog.paypad.id} username={getPaypadDisplayName(activeDialog.paypad)} /> : null}
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
        recordLabel={deleteTarget ? `${getPaypadDisplayName(deleteTarget)} (ID ${deleteTarget.id})` : "el Pay+ seleccionado"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
