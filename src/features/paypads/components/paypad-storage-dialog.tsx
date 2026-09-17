"use client";

import { LoaderCircle, Save, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import { usePaypadStorage, useSavePaypadStorage } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { PayPad, PayPadStorage, PayPadStorageMutation } from "@/features/paypads/schemas";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface PayPadStorageDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

interface StorageEntry {
  isDispensing: boolean;
  minDpQuantity: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar la configuración de almacenamiento.";
}

function DenominationPreview({ denomination }: { denomination: CurrencyDenomination }) {
  return (
    <BackendStaticImage
      alt={`Denominación ${formatDashboardMoney(denomination.value)}`}
      height={40}
      src={backendStaticFilePath(denomination.img)}
      width={64}
    />
  );
}

function getStorageEntry(storage: readonly PayPadStorage[], denominationId: number): StorageEntry {
  const matchingStorage = storage.find((item) => item.idCurrencyDenomination === denominationId);
  return {
    isDispensing: matchingStorage?.isDispensing ?? false,
    minDpQuantity: matchingStorage?.minDpQuantity ?? "0",
  };
}

export function PayPadStorageDialog({ onOpenChange, open, paypad }: PayPadStorageDialogProps) {
  const session = useDashboardSession();
  const canWrite = hasPermission(session, "WriteTonnagesAndLoads");
  const storageQuery = usePaypadStorage(paypad?.id ?? null);
  const denominationsQuery = useDenominations(open);
  const saveMutation = useSavePaypadStorage();
  const [overrides, setOverrides] = useState<Record<string, StorageEntry>>({});
  const storage = useMemo(() => storageQuery.data ?? [], [storageQuery.data]);
  const denominations = useMemo(
    () => (denominationsQuery.data ?? []).filter((item) => item.idCurrency === paypad?.idCurrency),
    [denominationsQuery.data, paypad?.idCurrency],
  );
  const isLoading = storageQuery.isPending || denominationsQuery.isPending;
  const queryError = storageQuery.error ?? denominationsQuery.error;

  const entries = useMemo<Record<string, StorageEntry>>(
    () => Object.fromEntries(
      denominations.map((denomination) => {
        const key = String(denomination.id);
        return [key, overrides[key] ?? getStorageEntry(storage, denomination.id)];
      }),
    ),
    [denominations, overrides, storage],
  );

  function entryFor(denominationId: number): StorageEntry {
    return entries[String(denominationId)] ?? getStorageEntry(storage, denominationId);
  }

  function close(): void {
    if (!saveMutation.isPending) {
      onOpenChange(false);
    }
  }

  async function save(): Promise<void> {
    if (!paypad) {
      return;
    }

    const invalidEntry = denominations.find((denomination) => {
      const entry = entryFor(denomination.id);
      return entry.minDpQuantity !== "0" && !entry.isDispensing;
    });
    if (invalidEntry) {
      toast.error(`Activa dispensación para ${formatDashboardMoney(invalidEntry.value)} o deja la cantidad mínima en cero.`);
      return;
    }

    const payload: PayPadStorageMutation[] = denominations.flatMap((denomination) => {
      const entry = entryFor(denomination.id);
      const existed = storage.some((item) => item.idCurrencyDenomination === denomination.id && item.isDispensing);
      return entry.isDispensing || existed
        ? [{
            idCurrencyDenomination: denomination.id,
            idPayPad: paypad.id,
            isDispensing: entry.isDispensing,
            minDpQuantity: entry.minDpQuantity,
          }]
        : [];
    });

    try {
      await saveMutation.mutateAsync(payload);
      toast.success("Configuración de almacenamiento actualizada.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const columns: ColumnDef<CurrencyDenomination, unknown>[] = [
    { id: "image", cell: ({ row }) => <DenominationPreview denomination={row.original} />, header: "Billete", meta: { mobileLabel: "Billete" } },
    { accessorKey: "value", cell: ({ row }) => <span className="font-numeric font-medium">{formatDashboardMoney(row.original.value)}</span>, header: "Valor", meta: { mobileLabel: "Valor" } },
    {
      id: "dispensing",
      cell: ({ row }) => {
        const entry = entryFor(row.original.id);
        return <Switch aria-label={`Dispensación para ${formatDashboardMoney(row.original.value)}`} checked={entry.isDispensing} disabled={!canWrite || saveMutation.isPending} onCheckedChange={(isDispensing) => setOverrides((current) => ({ ...current, [String(row.original.id)]: { ...entry, isDispensing } }))} />;
      },
      header: "Dispensación",
      meta: { mobileLabel: "Dispensación" },
    },
    {
      id: "minimum",
      cell: ({ row }) => {
        const entry = entryFor(row.original.id);
        return <Input aria-label={`Cantidad mínima para ${formatDashboardMoney(row.original.value)}`} disabled={!canWrite || saveMutation.isPending} inputMode="numeric" onChange={(event) => { const value = event.target.value; if (/^\d*$/.test(value)) setOverrides((current) => ({ ...current, [String(row.original.id)]: { ...entry, minDpQuantity: value || "0" } })); }} pattern="[0-9]*" value={entry.minDpQuantity} />;
      },
      header: "Cantidad mínima de operación",
      meta: { mobileLabel: "Cantidad mínima" },
    },
  ];

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 aria-hidden="true" className="size-5" />Configuración de denominaciones</DialogTitle>
          <DialogDescription>Define qué denominaciones puede dispensar {getPaypadDisplayName(paypad)} y su cantidad mínima de operación.</DialogDescription>
        </DialogHeader>
        {isLoading ? <ListSkeleton rows={4} /> : null}
        {!isLoading && queryError ? <ErrorState description={getErrorMessage(queryError)} onRetry={() => void Promise.all([storageQuery.refetch(), denominationsQuery.refetch()])} /> : null}
        {!isLoading && !queryError && denominations.length === 0 ? <EmptyState description="No hay denominaciones configuradas para la moneda de este Pay+." title="No hay denominaciones" /> : null}
        {!isLoading && !queryError && denominations.length > 0 ? <ResponsiveDataTable columns={columns} data={denominations} getCardTitle={(denomination) => formatDashboardMoney(denomination.value)} getRowId={(denomination) => String(denomination.id)} label="Configuración de denominaciones" /> : null}
        {!isLoading && !queryError && !canWrite ? <Alert><AlertDescription>Tu rol puede consultar esta configuración, pero no modificarla.</AlertDescription></Alert> : null}
        <DialogFooter>
          <Button disabled={saveMutation.isPending} onClick={close} type="button" variant="outline">Cerrar</Button>
          {canWrite ? <Button disabled={saveMutation.isPending || denominations.length === 0} onClick={() => void save()} type="button">{saveMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{saveMutation.isPending ? "Guardando…" : "Guardar"}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
