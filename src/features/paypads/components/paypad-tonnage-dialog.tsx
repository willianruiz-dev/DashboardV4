"use client";

import { Archive, LoaderCircle, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { CriticalConfirmationDialog } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import { usePaypadStorage, useSaveTonnage } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { PayPad, PayPadStorage, TonnageMutation } from "@/features/paypads/schemas";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardMoney, sumMoneyStrings } from "@/lib/formatters/money";

interface PayPadTonnageDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar el almacenamiento del Pay+.";
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

function StorageTable({ denominationImageById, label, rows, total }: { denominationImageById: ReadonlyMap<number, string | null | undefined>; label: string; rows: PayPadStorage[]; total: string }) {
  const columns: ColumnDef<PayPadStorage, unknown>[] = [
    {
      id: "image",
      cell: ({ row }) => (
        <DenominationImage
          imagePath={row.original.imgDenom ?? denominationImageById.get(row.original.idCurrencyDenomination) ?? null}
          value={row.original.denominationValue}
        />
      ),
      header: "Billete",
      meta: { mobileLabel: "Billete" },
    },
    { accessorKey: "denominationValue", cell: ({ row }) => <span className="font-numeric font-medium">{formatDashboardMoney(row.original.denominationValue)}</span>, header: "Denominación", meta: { mobileLabel: "Denominación" } },
    { id: "quantity", cell: ({ row }) => label === "Aceptadores" ? row.original.apStored : row.original.dpStored, header: "Unidades", meta: { mobileLabel: "Unidades" } },
    { id: "amount", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(label === "Aceptadores" ? row.original.apTotal : row.original.dpTotal)}</span>, header: "Valor", meta: { mobileLabel: "Valor" } },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        {rows.length > 0 ? <ResponsiveDataTable columns={columns} data={rows} getCardTitle={(row) => formatDashboardMoney(row.denominationValue)} getRowId={(row) => String(row.idCurrencyDenomination)} label={label} /> : <p className="text-sm text-muted-foreground">No hay unidades en {label.toLocaleLowerCase()}.</p>}
        <div className="flex justify-between border-t pt-3 text-sm"><span className="font-medium">Total</span><span className="font-numeric font-semibold">{formatDashboardMoney(total)}</span></div>
      </CardContent>
    </Card>
  );
}

export function PayPadTonnageDialog({ onOpenChange, open, paypad }: PayPadTonnageDialogProps) {
  const session = useDashboardSession();
  const canWrite = hasPermission(session, "WriteTonnagesAndLoads");
  const canReadMasters = hasPermission(session, "ReadMasters");
  const storageQuery = usePaypadStorage(paypad?.id ?? null);
  const denominationsQuery = useDenominations(open && canReadMasters);
  const saveMutation = useSaveTonnage();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const storage = useMemo(() => storageQuery.data ?? [], [storageQuery.data]);
  const denominationImageById = useMemo(
    () => new Map((denominationsQuery.data ?? []).map((denomination) => [denomination.id, denomination.img] as const)),
    [denominationsQuery.data],
  );
  const acceptedRows = useMemo(() => storage.filter((item) => item.apStored !== "0"), [storage]);
  const dispenserRows = useMemo(() => storage.filter((item) => item.dpStored !== "0"), [storage]);
  const totalAccepted = sumMoneyStrings(storage.map((item) => item.apTotal));
  const totalDispenser = sumMoneyStrings(storage.map((item) => item.dpTotal));
  const totalRejected = sumMoneyStrings(storage.map((item) => item.rjTotal));
  // Keep the same total supplied by the storage endpoint that the legacy screen sent.
  const total = sumMoneyStrings(storage.map((item) => item.total));

  function close(): void {
    if (!saveMutation.isPending) {
      onOpenChange(false);
    }
  }

  function createTonnagePayload(): TonnageMutation | null {
    if (!paypad) {
      return null;
    }

    return {
      idPayPad: paypad.id,
      total,
      totalAp: totalAccepted,
      totalDp: totalDispenser,
      totalRj: totalRejected,
    };
  }

  async function confirmTonnage(): Promise<void> {
    const payload = createTonnagePayload();
    if (!payload) {
      return;
    }

    try {
      await saveMutation.mutateAsync(payload);
      toast.success("Arqueo registrado con éxito.");
      setConfirmationOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <>
      <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Scale aria-hidden="true" className="size-5" />Realizar arqueo</DialogTitle>
            <DialogDescription>Revisa el efectivo almacenado en {getPaypadDisplayName(paypad)}. El API calcula y registra el arqueo con el almacenamiento actual.</DialogDescription>
          </DialogHeader>
          {storageQuery.isPending ? <ListSkeleton rows={4} /> : null}
          {!storageQuery.isPending && storageQuery.isError ? <ErrorState description={getErrorMessage(storageQuery.error)} onRetry={() => void storageQuery.refetch()} /> : null}
          {!storageQuery.isPending && !storageQuery.isError && storage.length === 0 ? <EmptyState description="No hay almacenamiento para arqueo en este Pay+." title="No hay efectivo almacenado" /> : null}
          {!storageQuery.isPending && !storageQuery.isError && storage.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <StorageTable denominationImageById={denominationImageById} label="Aceptadores" rows={acceptedRows} total={totalAccepted} />
              <StorageTable denominationImageById={denominationImageById} label="Dispensadores" rows={dispenserRows} total={totalDispenser} />
              <Card className="lg:col-span-2"><CardContent className="flex items-center justify-between gap-3 p-5"><span className="flex items-center gap-2 text-sm font-medium"><Archive aria-hidden="true" className="size-4" />Baúl de rechazo</span><span className="font-numeric text-base font-semibold">{formatDashboardMoney(totalRejected)}</span></CardContent></Card>
            </div>
          ) : null}
          {!canWrite ? <Alert><AlertDescription>Tu rol puede consultar el almacenamiento, pero no registrar arqueos.</AlertDescription></Alert> : null}
          <div className="flex items-center justify-between rounded-md border bg-secondary px-4 py-3"><span className="text-sm font-medium">Total almacenado</span><span className="font-numeric text-lg font-semibold">{formatDashboardMoney(total)}</span></div>
          <DialogFooter>
            <Button disabled={saveMutation.isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
            {canWrite ? <Button disabled={saveMutation.isPending} onClick={() => setConfirmationOpen(true)} type="button">{saveMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Scale aria-hidden="true" className="size-4" />}{saveMutation.isPending ? "Registrando…" : "Registrar arqueo"}</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CriticalConfirmationDialog
        confirmationLabel="Confirmar arqueo"
        description={`Vas a registrar un arqueo sobre ${formatDashboardMoney(total)} en ${getPaypadDisplayName(paypad)}. Esta operación financiera es irreversible.`}
        isPending={saveMutation.isPending}
        onConfirm={() => void confirmTonnage()}
        onOpenChange={setConfirmationOpen}
        open={confirmationOpen}
        pendingLabel="Registrando…"
        title="Confirmar arqueo irreversible"
        verificationText={paypad ? String(paypad.id) : ""}
      />
    </>
  );
}
