"use client";

import { LoaderCircle, Save, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { CriticalConfirmationDialog } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import { usePaypadStorage, useSaveLoad } from "@/features/paypads/hooks";
import type { LoadMutation, PayPad, PayPadStorage } from "@/features/paypads/schemas";
import { backendStaticFilePath } from "@/lib/api/backend";
import { formatDashboardMoney, multiplyMoneyString, sumMoneyStrings } from "@/lib/formatters/money";

interface PayPadLoadDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar las denominaciones disponibles.";
}

function DenominationImage({ imagePath, value }: { imagePath: string | null; value: string }) {
  return (
    <BackendStaticImage
      alt={`Billete de ${formatDashboardMoney(value)}`}
      height={40}
      src={backendStaticFilePath(imagePath)}
      width={64}
    />
  );
}

export function PayPadLoadDialog({ onOpenChange, open, paypad }: PayPadLoadDialogProps) {
  const session = useDashboardSession();
  const canWrite = hasPermission(session, "WriteTonnagesAndLoads");
  const canReadMasters = hasPermission(session, "ReadMasters");
  const storageQuery = usePaypadStorage(paypad?.id ?? null);
  const denominationsQuery = useDenominations(open && canReadMasters);
  const saveMutation = useSaveLoad();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const storage = useMemo(() => (storageQuery.data ?? []).filter((item) => item.isDispensing), [storageQuery.data]);
  const denominationImageById = useMemo(
    () => new Map((denominationsQuery.data ?? []).map((denomination) => [denomination.id, denomination.img] as const)),
    [denominationsQuery.data],
  );
  const total = sumMoneyStrings(storage.map((item) => multiplyMoneyString(item.denominationValue, quantities[String(item.idCurrencyDenomination)] ?? "0")));
  const hasQuantity = storage.some((item) => (quantities[String(item.idCurrencyDenomination)] ?? "0") !== "0");

  function close(): void {
    if (!saveMutation.isPending) {
      onOpenChange(false);
    }
  }

  function setQuantity(id: number, value: string): void {
    if (/^\d*$/.test(value)) {
      setQuantities((current) => ({ ...current, [String(id)]: value || "0" }));
    }
  }

  function createPayload(): LoadMutation | null {
    if (!paypad || !hasQuantity || total === "0") {
      return null;
    }

    return {
      details: storage.flatMap((item) => {
        const quantity = quantities[String(item.idCurrencyDenomination)] ?? "0";
        return quantity === "0"
          ? []
          : [{
              denominationValue: item.denominationValue,
              idCurrencyDenomination: item.idCurrencyDenomination,
              quantity,
            }];
      }),
      idPayPad: paypad.id,
      totalLoaded: total,
    };
  }

  async function confirmSave(): Promise<void> {
    const payload = createPayload();
    if (!payload) {
      toast.error("Ingresa al menos una cantidad para registrar el cargue.");
      setConfirmationOpen(false);
      return;
    }

    try {
      await saveMutation.mutateAsync(payload);
      toast.success("Cargue registrado con éxito.");
      setConfirmationOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const columns: ColumnDef<PayPadStorage, unknown>[] = [
    {
      id: "image",
      cell: ({ row }) => (
        <DenominationImage
          imagePath={denominationImageById.get(row.original.idCurrencyDenomination) ?? row.original.imgDenom ?? null}
          value={row.original.denominationValue}
        />
      ),
      header: "Billete",
      meta: { mobileLabel: "Billete" },
    },
    { accessorKey: "denominationValue", cell: ({ row }) => <span className="font-numeric font-medium">{formatDashboardMoney(row.original.denominationValue)}</span>, header: "Denominación", meta: { mobileLabel: "Denominación" } },
    { accessorKey: "minDpQuantity", cell: ({ row }) => row.original.minDpQuantity, header: "Mínimo configurado", meta: { mobileLabel: "Mínimo configurado" } },
    {
      id: "quantity",
      cell: ({ row }) => <Input aria-label={`Cantidad a cargar de ${formatDashboardMoney(row.original.denominationValue)}`} disabled={!canWrite || saveMutation.isPending} inputMode="numeric" onChange={(event) => setQuantity(row.original.idCurrencyDenomination, event.target.value)} pattern="[0-9]*" value={quantities[String(row.original.idCurrencyDenomination)] ?? "0"} />,
      header: "Unidades a cargar",
      meta: { mobileLabel: "Unidades a cargar" },
    },
    { id: "lineTotal", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(multiplyMoneyString(row.original.denominationValue, quantities[String(row.original.idCurrencyDenomination)] ?? "0"))}</span>, header: "Subtotal", meta: { mobileLabel: "Subtotal" } },
  ];

  return (
    <>
      <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><WalletCards aria-hidden="true" className="size-5" />Registrar cargue</DialogTitle>
            <DialogDescription>Indica las unidades a cargar en {paypad?.username ?? "el Pay+"}. Sólo aparecen denominaciones habilitadas para dispensación.</DialogDescription>
          </DialogHeader>
          {storageQuery.isPending ? <ListSkeleton rows={4} /> : null}
          {!storageQuery.isPending && storageQuery.isError ? <ErrorState description={getErrorMessage(storageQuery.error)} onRetry={() => void storageQuery.refetch()} /> : null}
          {!storageQuery.isPending && !storageQuery.isError && storage.length === 0 ? <EmptyState description="Configura primero las denominaciones de dispensación para este Pay+." title="No hay denominaciones disponibles" /> : null}
          {!storageQuery.isPending && !storageQuery.isError && storage.length > 0 ? <ResponsiveDataTable columns={columns} data={storage} getCardDescription={(item) => `Mínimo configurado: ${item.minDpQuantity}`} getCardTitle={(item) => formatDashboardMoney(item.denominationValue)} getRowId={(item) => String(item.idCurrencyDenomination)} label="Denominaciones disponibles para cargue" /> : null}
          {!canWrite ? <Alert><AlertDescription>Tu rol puede consultar el cargue, pero no registrarlo.</AlertDescription></Alert> : null}
          <div className="flex items-center justify-between rounded-md border bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Total a cargar</span>
            <span className="font-numeric text-lg font-semibold">{formatDashboardMoney(total)}</span>
          </div>
          <DialogFooter>
            <Button disabled={saveMutation.isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
            {canWrite ? <Button disabled={saveMutation.isPending || storage.length === 0} onClick={() => setConfirmationOpen(true)} type="button">{saveMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{saveMutation.isPending ? "Registrando…" : "Registrar cargue"}</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CriticalConfirmationDialog
        confirmationLabel="Confirmar cargue"
        description={`Vas a registrar un cargue por ${formatDashboardMoney(total)} en ${paypad?.username ?? "el Pay+"}. Esta operación financiera es irreversible.`}
        isPending={saveMutation.isPending}
        onConfirm={() => void confirmSave()}
        onOpenChange={setConfirmationOpen}
        open={confirmationOpen}
        pendingLabel="Registrando…"
        title="Confirmar cargue irreversible"
        verificationText={paypad ? String(paypad.id) : ""}
      />
    </>
  );
}
