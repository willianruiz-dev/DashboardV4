"use client";

import { CalendarRange, Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchablePaypadSelect } from "@/features/paypads/components/searchable-paypad-select";
import type { PayPad } from "@/features/paypads/schemas";
import { createPresetRange } from "@/features/dispensing-control/hooks";
import {
  dispensingPresetLabels,
  MAX_CUSTOM_RANGE_DAYS,
  type DispensingRange,
  type DispensingTimePreset,
} from "@/features/dispensing-control/schemas";

const quickPresets: Exclude<DispensingTimePreset, "rango">[] = ["hoy", "24h", "7d"];

export interface DispensingFilterSelection {
  paypadId: number | null;
  preset: DispensingTimePreset;
  range: DispensingRange;
}

interface DispensingFiltersProps {
  disabled?: boolean;
  onApply: (selection: DispensingFilterSelection) => void;
  paypadId: number | null;
  paypads: readonly PayPad[];
}

/**
 * Barra de filtros del control de dispensado: máquina (Pay+) + presets de
 * tiempo rápidos (Hoy / 24 h / 7 días) + rango personalizado (tope 31 días).
 */
export function DispensingFilters({ disabled = false, onApply, paypadId, paypads }: DispensingFiltersProps) {
  const [preset, setPreset] = useState<DispensingTimePreset>("hoy");
  const [customRange, setCustomRange] = useState<DispensingRange>(() => createPresetRange("hoy"));
  const [rangeError, setRangeError] = useState<string | null>(null);

  function activeRange(): DispensingRange {
    return preset === "rango" ? customRange : createPresetRange(preset);
  }

  function handleMachineChange(value: string): void {
    onApply({
      paypadId: /^\d+$/.test(value) ? Number(value) : null,
      preset,
      range: activeRange(),
    });
  }

  function handleQuickPreset(next: Exclude<DispensingTimePreset, "rango">): void {
    setPreset(next);
    setRangeError(null);
    onApply({ paypadId, preset: next, range: createPresetRange(next) });
  }

  function handleOpenCustomRange(): void {
    setPreset("rango");
    setRangeError(null);
  }

  function handleApplyCustomRange(): void {
    const { from, to } = customRange;
    if (!from || !to) {
      setRangeError("Indica la fecha y hora inicial y final.");
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setRangeError("Las fechas deben tener un formato válido.");
      return;
    }

    if (fromDate.getTime() > toDate.getTime()) {
      setRangeError("La fecha inicial debe ser anterior a la final.");
      return;
    }

    if (toDate.getTime() - fromDate.getTime() > MAX_CUSTOM_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      setRangeError(`El rango personalizado admite hasta ${MAX_CUSTOM_RANGE_DAYS} días por máquina.`);
      return;
    }

    setRangeError(null);
    onApply({ paypadId, preset: "rango", range: { from, to } });
  }

  return (
    <Card className="animate-rise">
      <CardHeader className="gap-2 pb-4">
        <CardTitle className="text-base">Parámetros del control</CardTitle>
        <CardDescription>
          AP y RJ se calculan sobre las transacciones del período; DP y los saldos de baúl sobre el último arqueo y el inventario del sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid min-w-72 max-w-xl flex-1 gap-2">
            <span className="text-sm font-medium">Máquina (Pay+)</span>
            <SearchablePaypadSelect
              disabled={disabled}
              id="dispensing-paypad"
              onValueChange={handleMachineChange}
              paypads={paypads}
              placeholder="Busca y selecciona una máquina"
              value={paypadId !== null ? String(paypadId) : ""}
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Período</span>
            <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200/80 bg-slate-50/70 p-1 dark:border-slate-700 dark:bg-slate-900/40">
              {quickPresets.map((option) => (
                <Button
                  disabled={disabled}
                  key={option}
                  onClick={() => handleQuickPreset(option)}
                  size="sm"
                  type="button"
                  variant={preset === option ? "default" : "ghost"}
                >
                  {dispensingPresetLabels[option]}
                </Button>
              ))}
              <Button
                disabled={disabled}
                onClick={handleOpenCustomRange}
                size="sm"
                type="button"
                variant={preset === "rango" ? "default" : "ghost"}
              >
                <CalendarRange aria-hidden="true" className="size-4" />
                {dispensingPresetLabels.rango}
              </Button>
            </div>
          </div>
        </div>

        {preset === "rango" ? (
          <div className="grid gap-3 rounded-lg border border-blue-200/70 bg-blue-50/50 p-4 transition-colors duration-300 dark:border-blue-500/25 dark:bg-blue-500/5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Desde</span>
              <Input
                aria-label="Fecha y hora inicial del rango"
                disabled={disabled}
                max={customRange.to}
                onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))}
                type="datetime-local"
                value={customRange.from}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Hasta</span>
              <Input
                aria-label="Fecha y hora final del rango"
                disabled={disabled}
                min={customRange.from}
                onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))}
                type="datetime-local"
                value={customRange.to}
              />
            </div>
            <Button disabled={disabled} onClick={handleApplyCustomRange} type="button" variant="success">
              <Check aria-hidden="true" className="size-4" />
              Aplicar rango
            </Button>
          </div>
        ) : null}

        {rangeError ? <p className="text-sm text-destructive" role="alert">{rangeError}</p> : null}
      </CardContent>
    </Card>
  );
}
