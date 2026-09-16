"use client";

import { ChevronRight, History } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePaypadLoads, usePaypadTonnages } from "@/features/paypads/hooks";
import type { Load, LoadDetail, PayPad, Tonnage, TonnageDetail } from "@/features/paypads/schemas";
import { ClientApiError } from "@/lib/api/client";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface PayPadBalanceDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

function displayDate(value: string | null | undefined): string {
  return value?.replace("T", " ") ?? "Fecha no disponible";
}

function isNotFound(error: unknown): boolean {
  return error instanceof ClientApiError && error.status === 404;
}

function LoadDetails({ details }: { details: readonly LoadDetail[] }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este cargue.</p>;
  }

  return <div className="grid gap-2 sm:grid-cols-2">{details.map((detail, index) => <Card key={`${detail.idCurrencyDenomination}-${index}`}><CardContent className="flex items-center justify-between gap-3 p-3 text-sm"><span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span><span>{detail.quantity} unidades</span></CardContent></Card>)}</div>;
}

function TonnageDetails({ details }: { details: readonly TonnageDetail[] }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este arqueo.</p>;
  }

  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{details.map((detail, index) => <Card key={`${detail.idCurrencyDenomination}-${index}`}><CardContent className="grid gap-1 p-3 text-sm"><span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span><span>Aceptadores: {detail.quantityAp}</span><span>Dispensadores: {detail.quantityDp}</span><span>Baúl de rechazo: {detail.quantityRj}</span><span>Total: {detail.quantityTotal}</span></CardContent></Card>)}</div>;
}

function BalanceHistory({ loads, tonnages }: { loads: Load[]; tonnages: Tonnage[] }) {
  const [openLoadIds, setOpenLoadIds] = useState<Set<number>>(new Set());
  const [openTonnageIds, setOpenTonnageIds] = useState<Set<number>>(new Set());
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Arqueos</h3><Badge variant="secondary">{tonnages.length}</Badge></div>
        {tonnages.length === 0 ? <p className="text-sm text-muted-foreground">No hay arqueos registrados.</p> : <div className="grid gap-3">{tonnages.map((tonnage) => <div className="grid gap-2 rounded-md border p-3" key={tonnage.id}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-numeric font-semibold">{formatDashboardMoney(tonnage.total)}</span><Button aria-expanded={openTonnageIds.has(tonnage.id)} onClick={() => setOpenTonnageIds((current) => { const next = new Set(current); if (next.has(tonnage.id)) next.delete(tonnage.id); else next.add(tonnage.id); return next; })} size="sm" type="button" variant="ghost"><ChevronRight aria-hidden="true" className={openTonnageIds.has(tonnage.id) ? "size-4 rotate-90" : "size-4"} />Detalle</Button></div><span className="text-xs text-muted-foreground">{displayDate(tonnage.dateCreated)}</span>{openTonnageIds.has(tonnage.id) ? <TonnageDetails details={tonnage.details} /> : null}</div>)}</div>}
      </section>
      <section className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Cargues</h3><Badge variant="secondary">{loads.length}</Badge></div>
        {loads.length === 0 ? <p className="text-sm text-muted-foreground">No hay cargues registrados.</p> : <div className="grid gap-3">{loads.map((load) => <div className="grid gap-2 rounded-md border p-3" key={load.id}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-numeric font-semibold">{formatDashboardMoney(load.totalLoaded)}</span><Button aria-expanded={openLoadIds.has(load.id)} onClick={() => setOpenLoadIds((current) => { const next = new Set(current); if (next.has(load.id)) next.delete(load.id); else next.add(load.id); return next; })} size="sm" type="button" variant="ghost"><ChevronRight aria-hidden="true" className={openLoadIds.has(load.id) ? "size-4 rotate-90" : "size-4"} />Detalle</Button></div><span className="text-xs text-muted-foreground">{displayDate(load.dateCreated)}</span>{openLoadIds.has(load.id) ? <LoadDetails details={load.details} /> : null}</div>)}</div>}
      </section>
    </div>
  );
}

export function PayPadBalanceDialog({ onOpenChange, open, paypad }: PayPadBalanceDialogProps) {
  const loadsQuery = usePaypadLoads(paypad?.id ?? null);
  const tonnagesQuery = usePaypadTonnages(paypad?.id ?? null);
  const loading = loadsQuery.isPending || tonnagesQuery.isPending;
  const blockingError = [loadsQuery.error, tonnagesQuery.error].find((error) => error && !isNotFound(error));
  const loads = isNotFound(loadsQuery.error) ? [] : (loadsQuery.data ?? []);
  const tonnages = isNotFound(tonnagesQuery.error) ? [] : (tonnagesQuery.data ?? []);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History aria-hidden="true" className="size-5" />Cargues y arqueos</DialogTitle>
          <DialogDescription>Consulta los movimientos registrados para {paypad?.username ?? "el Pay+"}.</DialogDescription>
        </DialogHeader>
        {loading ? <ListSkeleton rows={5} /> : null}
        {!loading && blockingError ? <ErrorState description={blockingError instanceof Error ? blockingError.message : "No fue posible cargar los movimientos."} onRetry={() => void Promise.all([loadsQuery.refetch(), tonnagesQuery.refetch()])} /> : null}
        {!loading && !blockingError && loads.length === 0 && tonnages.length === 0 ? <EmptyState description="No hay cargues ni arqueos registrados para este Pay+." title="Sin movimientos" /> : null}
        {!loading && !blockingError && (loads.length > 0 || tonnages.length > 0) ? <BalanceHistory loads={loads} tonnages={tonnages} /> : null}
        <DialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
