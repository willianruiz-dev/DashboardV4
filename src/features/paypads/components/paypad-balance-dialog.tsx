"use client";

import { ChevronRight, History } from "lucide-react";
import { useMemo, useState } from "react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import { usePaypadLoads, usePaypadTonnages } from "@/features/paypads/hooks";
import type { Load, LoadDetail, PayPad, Tonnage, TonnageDetail } from "@/features/paypads/schemas";
import { ClientApiError } from "@/lib/api/client";
import { backendStaticFilePath } from "@/lib/api/backend";
import { formatDashboardMoney } from "@/lib/formatters/money";

type DenominationImageById = ReadonlyMap<number, string | null | undefined>;

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

function DenominationImage({ imageById, denominationId, value }: { denominationId: number; imageById: DenominationImageById; value: string }) {
  return (
    <BackendStaticImage
      alt={`Billete de ${formatDashboardMoney(value)}`}
      height={40}
      src={backendStaticFilePath(imageById.get(denominationId) ?? null)}
      width={64}
    />
  );
}

function LoadDetails({ details, imageById }: { details: readonly LoadDetail[]; imageById: DenominationImageById }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este cargue.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination}-${index}`}>
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} imageById={imageById} value={detail.denominationValue} />
              <span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span>
            </div>
            <span className="shrink-0">{detail.quantity} unidades</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TonnageDetails({ details, imageById }: { details: readonly TonnageDetail[]; imageById: DenominationImageById }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este arqueo.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination}-${index}`}>
          <CardContent className="grid gap-2 p-3 text-sm">
            <div className="flex items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} imageById={imageById} value={detail.denominationValue} />
              <span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span>
            </div>
            <span>Aceptadores: {detail.quantityAp}</span>
            <span>Dispensadores: {detail.quantityDp}</span>
            <span>Baúl de rechazo: {detail.quantityRj}</span>
            <span>Total: {detail.quantityTotal}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BalanceHistory({ imageById, loads, tonnages }: { imageById: DenominationImageById; loads: Load[]; tonnages: Tonnage[] }) {
  const [openLoadIds, setOpenLoadIds] = useState<Set<number>>(new Set());
  const [openTonnageIds, setOpenTonnageIds] = useState<Set<number>>(new Set());

  function toggleLoad(id: number): void {
    setOpenLoadIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleTonnage(id: number): void {
    setOpenTonnageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Arqueos</h3>
          <Badge variant="secondary">{tonnages.length}</Badge>
        </div>
        {tonnages.length === 0 ? <p className="text-sm text-muted-foreground">No hay arqueos registrados.</p> : null}
        {tonnages.length > 0 ? (
          <div className="grid gap-3">
            {tonnages.map((tonnage) => {
              const isExpanded = openTonnageIds.has(tonnage.id);
              return (
                <div className="grid gap-2 rounded-md border p-3" key={tonnage.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-numeric font-semibold">{formatDashboardMoney(tonnage.total)}</span>
                    <Button aria-expanded={isExpanded} onClick={() => toggleTonnage(tonnage.id)} type="button" variant="ghost">
                      <ChevronRight aria-hidden="true" className={isExpanded ? "size-4 rotate-90" : "size-4"} />
                      Detalle
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">{displayDate(tonnage.dateCreated)}</span>
                  {isExpanded ? <TonnageDetails details={tonnage.details} imageById={imageById} /> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Cargues</h3>
          <Badge variant="secondary">{loads.length}</Badge>
        </div>
        {loads.length === 0 ? <p className="text-sm text-muted-foreground">No hay cargues registrados.</p> : null}
        {loads.length > 0 ? (
          <div className="grid gap-3">
            {loads.map((load) => {
              const isExpanded = openLoadIds.has(load.id);
              return (
                <div className="grid gap-2 rounded-md border p-3" key={load.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-numeric font-semibold">{formatDashboardMoney(load.totalLoaded)}</span>
                    <Button aria-expanded={isExpanded} onClick={() => toggleLoad(load.id)} type="button" variant="ghost">
                      <ChevronRight aria-hidden="true" className={isExpanded ? "size-4 rotate-90" : "size-4"} />
                      Detalle
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">{displayDate(load.dateCreated)}</span>
                  {isExpanded ? <LoadDetails details={load.details} imageById={imageById} /> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function PayPadBalanceDialog({ onOpenChange, open, paypad }: PayPadBalanceDialogProps) {
  const session = useDashboardSession();
  const canReadMasters = hasPermission(session, "ReadMasters");
  const loadsQuery = usePaypadLoads(paypad?.id ?? null);
  const tonnagesQuery = usePaypadTonnages(paypad?.id ?? null);
  const denominationsQuery = useDenominations(open && canReadMasters);
  const loading = loadsQuery.isPending || tonnagesQuery.isPending;
  const blockingError = [loadsQuery.error, tonnagesQuery.error].find((error) => error && !isNotFound(error));
  const loads = isNotFound(loadsQuery.error) ? [] : (loadsQuery.data ?? []);
  const tonnages = isNotFound(tonnagesQuery.error) ? [] : (tonnagesQuery.data ?? []);
  const imageById = useMemo<DenominationImageById>(
    () => new Map((denominationsQuery.data ?? []).map((denomination) => [denomination.id, denomination.img] as const)),
    [denominationsQuery.data],
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="size-5" />
            Cargues y arqueos
          </DialogTitle>
          <DialogDescription>Consulta los movimientos registrados para {paypad?.username ?? "el Pay+"}.</DialogDescription>
        </DialogHeader>
        {loading ? <ListSkeleton rows={5} /> : null}
        {!loading && blockingError ? (
          <ErrorState
            description={blockingError instanceof Error ? blockingError.message : "No fue posible cargar los movimientos."}
            onRetry={() => void Promise.all([loadsQuery.refetch(), tonnagesQuery.refetch()])}
          />
        ) : null}
        {!loading && !blockingError && loads.length === 0 && tonnages.length === 0 ? (
          <EmptyState description="No hay cargues ni arqueos registrados para este Pay+." title="Sin movimientos" />
        ) : null}
        {!loading && !blockingError && (loads.length > 0 || tonnages.length > 0) ? (
          <BalanceHistory imageById={imageById} loads={loads} tonnages={tonnages} />
        ) : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
