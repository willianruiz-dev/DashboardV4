"use client";

import { Banknote, Building2, CircleCheck, CircleDollarSign, CircleSlash, Coins, Edit3, Eye, KeyRound, Layers, MapPin, MonitorSmartphone, Plus, Scale, Search, Settings2, Trash2, type LucideIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-9 min-w-9 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
          disabled={disabled}
          onClick={onClick}
          size="icon"
          type="button"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
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

type StatTone = "approved" | "neutral" | "system";

/** Clases literales completas para que Tailwind las detecte. */
const statToneStyles: Record<StatTone, { accent: string; chip: string; value: string }> = {
  approved: {
    accent: "from-emerald-400/90 via-teal-300/60 to-transparent",
    chip: "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-emerald-200/80 glow-emerald dark:from-emerald-500/25 dark:to-emerald-500/5 dark:text-emerald-400 dark:ring-emerald-500/25",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  neutral: {
    accent: "from-slate-300/80 via-slate-200/60 to-transparent",
    chip: "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-slate-200/80 dark:from-slate-500/25 dark:to-slate-500/5 dark:text-slate-300 dark:ring-slate-500/25",
    value: "text-slate-600 dark:text-slate-300",
  },
  system: {
    accent: "from-blue-400/90 via-sky-300/60 to-transparent",
    chip: "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-blue-200/80 glow-blue dark:from-blue-500/25 dark:to-blue-500/5 dark:text-blue-400 dark:ring-blue-500/25",
    value: "text-blue-600 dark:text-blue-400",
  },
};

function PayPadStat({ delay, icon: Icon, label, tone, value }: { delay: number; icon: LucideIcon; label: string; tone: StatTone; value: number }) {
  const styles = statToneStyles[tone];

  return (
    <Card
      className="relative animate-rise overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-80", styles.accent)} />
      <div className="flex items-center gap-4 p-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", styles.chip)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className={cn("font-numeric text-xl font-semibold tracking-tight", styles.value)}>{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Activo
      </Badge>
    );
  }

  return (
    <Badge className="shrink-0 border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      <span aria-hidden="true" className="size-2 rounded-full bg-slate-400 dark:bg-slate-500" />
      Inactivo
    </Badge>
  );
}

function PayPadCard({
  animationDelay,
  canDelete,
  canReadOperations,
  canWrite,
  office,
  onAction,
  paypad,
}: {
  animationDelay: number;
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
    <Card
      className="group relative flex min-w-0 animate-rise flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lift"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r transition-opacity duration-300",
          active ? "from-emerald-400 via-teal-300 to-blue-400 opacity-90" : "from-slate-300 via-slate-200 to-slate-300 opacity-70",
        )}
      />
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105",
                active
                  ? "bg-gradient-to-br from-blue-100 to-emerald-50 text-blue-600 ring-blue-200/70 dark:from-blue-500/25 dark:to-emerald-500/10 dark:text-blue-300 dark:ring-blue-500/25"
                  : "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-slate-200/80 dark:from-slate-700/40 dark:to-slate-700/10 dark:text-slate-500 dark:ring-slate-600/40",
              )}
            >
              <MonitorSmartphone aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="break-words text-sm leading-snug sm:text-base">{getPaypadDisplayName(paypad)}</CardTitle>
              <CardDescription className="font-mono text-xs tracking-wide">ID {paypad.id}</CardDescription>
            </div>
          </div>
          <StatusBadge active={active} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Building2 aria-hidden="true" className="size-4 shrink-0 text-blue-500/80" />
          <span className="truncate">{officeName}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">{officeAddress}</span>
        </div>
        {paypad.currency ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Coins aria-hidden="true" className="size-3.5" />
              {paypad.currency}
            </span>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-1 border-t border-slate-100 bg-slate-50/70 pb-4 pt-3.5 dark:border-slate-800 dark:bg-slate-900/40">
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
        {canDelete ? <ActionButton aria-label={`Eliminar ${getPaypadDisplayName(paypad)}`} onClick={() => onAction({ kind: "delete", paypad })} tooltip="Eliminar Pay+"><Trash2 aria-hidden="true" className="size-4 text-red-500 dark:text-red-400" /></ActionButton> : null}
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
  const activeCount = useMemo(() => paypads.filter((paypad) => paypad.status === 1).length, [paypads]);
  const inactiveCount = paypads.length - activeCount;
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
          <div className="grid gap-4 sm:grid-cols-3">
            <PayPadStat delay={0} icon={Layers} label="Equipos totales" tone="system" value={paypads.length} />
            <PayPadStat delay={70} icon={CircleCheck} label="Equipos activos" tone="approved" value={activeCount} />
            <PayPadStat delay={140} icon={CircleSlash} label="Equipos inactivos" tone="neutral" value={inactiveCount} />
          </div>
          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
              <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="paypad-search">
                Buscar equipos Pay+
                <span className="relative transition-shadow duration-300 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
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
            <div aria-label="Listado de Pay+ filtrado" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredPaypads.map((paypad, index) => (
                <PayPadCard
                  animationDelay={Math.min(index * 60, 480)}
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
