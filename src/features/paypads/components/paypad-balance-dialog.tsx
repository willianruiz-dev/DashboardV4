"use client";

import { ChevronRight, History } from "lucide-react";
import { useMemo, useState } from "react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import { usePaypadLoads, usePaypadTonnages } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { Load, LoadDetail, PayPad, Tonnage, TonnageDetail } from "@/features/paypads/schemas";
import { ClientApiError } from "@/lib/api/client";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface DenominationImages {
  byId: ReadonlyMap<number, string | null | undefined>;
  byValue: ReadonlyMap<string, string | null | undefined>;
}

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

function historyErrorMessage(error: unknown, fallback: string): string | null {
  if (!error || isNotFound(error)) {
    return null;
  }

  return error instanceof Error ? error.message : fallback;
}

function DenominationImage({ denominationId, images, value }: { denominationId: number | null; images: DenominationImages; value: string }) {
  const imagePath = (denominationId === null ? undefined : images.byId.get(denominationId)) ?? images.byValue.get(value) ?? null;

  return (
    <BackendStaticImage
      alt={`Billete de ${formatDashboardMoney(value)}`}
      height={40}
      src={backendStaticFilePath(imagePath)}
      width={64}
    />
  );
}

function LoadDetails({ details, images }: { details: readonly LoadDetail[]; images: DenominationImages }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este cargue.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination ?? detail.denominationValue}-${index}`}>
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} images={images} value={detail.denominationValue} />
              <span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span>
            </div>
            <span className="shrink-0">{detail.quantity} unidades</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TonnageDetails({ details, images }: { details: readonly TonnageDetail[]; images: DenominationImages }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este arqueo.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination ?? detail.denominationValue}-${index}`}>
          <CardContent className="grid gap-2 p-3 text-sm">
            <div className="flex items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} images={images} value={detail.denominationValue} />
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

interface BalanceHistoryProps {
  images: DenominationImages;
  loads: Load[];
  loadsError: string | null;
  loadsPending: boolean;
  onRetryLoads: () => void;
  onRetryTonnages: () => void;
  tonnages: Tonnage[];
  tonnagesError: string | null;
  tonnagesPending: boolean;
}

function BalanceHistory({
  images,
  loads,
  loadsError,
  loadsPending,
  onRetryLoads,
  onRetryTonnages,
  tonnages,
  tonnagesError,
  tonnagesPending,
}: BalanceHistoryProps) {
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
      <section aria-labelledby="tonnages-heading" className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" id="tonnages-heading">Arqueos</h3>
          <Badge variant="secondary">{tonnages.length}</Badge>
        </div>
        {tonnagesPending ? <ListSkeleton rows={3} /> : null}
        {!tonnagesPending && tonnagesError ? <ErrorState description={tonnagesError} onRetry={onRetryTonnages} /> : null}
        {!tonnagesPending && !tonnagesError && tonnages.length === 0 ? <p className="text-sm text-muted-foreground">No hay arqueos registrados.</p> : null}
        {!tonnagesPending && !tonnagesError && tonnages.length > 0 ? (
          <div className="grid gap-3">
            {tonnages.map((tonnage) => {
              const isExpanded = openTonnageIds.has(tonnage.id);
              return (
                <div className="grid gap-3 rounded-md border p-3" key={tonnage.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arqueo {tonnage.id}</p>
                      <p className="text-xs text-muted-foreground">{displayDate(tonnage.dateCreated)}</p>
                    </div>
                    <Button aria-expanded={isExpanded} onClick={() => toggleTonnage(tonnage.id)} type="button" variant="ghost">
                      <ChevronRight aria-hidden="true" className={isExpanded ? "size-4 rotate-90" : "size-4"} />
                      Detalle
                    </Button>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">Aceptadores</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalAp)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Dispensadores</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalDp)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Baúl de rechazo</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalRj)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-numeric font-semibold">{formatDashboardMoney(tonnage.total)}</dd></div>
                  </dl>
                  {isExpanded ? <TonnageDetails details={tonnage.details} images={images} /> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="loads-heading" className="grid content-start gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" id="loads-heading">Cargues</h3>
          <Badge variant="secondary">{loads.length}</Badge>
        </div>
        {loadsPending ? <ListSkeleton rows={3} /> : null}
        {!loadsPending && loadsError ? <ErrorState description={loadsError} onRetry={onRetryLoads} /> : null}
        {!loadsPending && !loadsError && loads.length === 0 ? <p className="text-sm text-muted-foreground">No hay cargues registrados.</p> : null}
        {!loadsPending && !loadsError && loads.length > 0 ? (
          <div className="grid gap-3">
            {loads.map((load) => {
              const isExpanded = openLoadIds.has(load.id);
              return (
                <div className="grid gap-3 rounded-md border p-3" key={load.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cargue {load.id}</p>
                      <p className="text-xs text-muted-foreground">{displayDate(load.dateCreated)}</p>
                    </div>
                    <Button aria-expanded={isExpanded} onClick={() => toggleLoad(load.id)} type="button" variant="ghost">
                      <ChevronRight aria-hidden="true" className={isExpanded ? "size-4 rotate-90" : "size-4"} />
                      Detalle
                    </Button>
                  </div>
                  <dl className="grid gap-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><dt className="text-muted-foreground">Valor total cargado</dt><dd className="font-numeric font-semibold">{formatDashboardMoney(load.totalLoaded)}</dd></div>
                  </dl>
                  {isExpanded ? <LoadDetails details={load.details} images={images} /> : null}
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
  const loadsError = historyErrorMessage(loadsQuery.error, "No fue posible cargar los cargues.");
  const tonnagesError = historyErrorMessage(tonnagesQuery.error, "No fue posible cargar los arqueos.");
  const loads = isNotFound(loadsQuery.error) ? [] : (loadsQuery.data ?? []);
  const tonnages = isNotFound(tonnagesQuery.error) ? [] : (tonnagesQuery.data ?? []);
  const images = useMemo<DenominationImages>(() => {
    const denominations = denominationsQuery.data ?? [];
    return {
      byId: new Map(denominations.map((denomination) => [denomination.id, denomination.img] as const)),
      byValue: new Map(denominations.map((denomination) => [denomination.value, denomination.img] as const)),
    };
  }, [denominationsQuery.data]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="size-5" />
            Cargues y arqueos
          </DialogTitle>
          <DialogDescription>Consulta los movimientos registrados para {getPaypadDisplayName(paypad)}.</DialogDescription>
        </DialogHeader>
        <BalanceHistory
          images={images}
          loads={loads}
          loadsError={loadsError}
          loadsPending={loadsQuery.isPending}
          onRetryLoads={() => void loadsQuery.refetch()}
          onRetryTonnages={() => void tonnagesQuery.refetch()}
          tonnages={tonnages}
          tonnagesError={tonnagesError}
          tonnagesPending={tonnagesQuery.isPending}
        />
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
