"use client";

import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDownloadExcel } from "@/features/transactions/hooks";

interface ExcelExportButtonProps {
  fileName: string;
  paypadId: number | null;
  transactionIds: readonly number[];
}

export function ExcelExportButton({ fileName, paypadId, transactionIds }: ExcelExportButtonProps) {
  const downloadMutation = useDownloadExcel();
  const readyToExport = paypadId !== null && transactionIds.length > 0;
  const unavailableReason = paypadId === null
    ? "Selecciona un Pay+ específico para generar el Excel."
    : "Consulta transacciones con resultados para generar el Excel.";

  async function exportExcel(): Promise<void> {
    if (!readyToExport || paypadId === null) {
      return;
    }

    try {
      await downloadMutation.mutateAsync({
        fileName,
        paypadId,
        transactionIds: [...transactionIds],
      });
      toast.success("El archivo Excel se descargó correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ocurrió un error generando el archivo Excel.");
    }
  }

  return (
    <Button
      aria-label={readyToExport ? "Descargar resultados en Excel" : unavailableReason}
      disabled={!readyToExport || downloadMutation.isPending}
      onClick={() => void exportExcel()}
      title={readyToExport ? "Descargar resultados en Excel" : unavailableReason}
      type="button"
      variant="success"
    >
      {downloadMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
      {downloadMutation.isPending ? "Generando Excel…" : "Descargar Excel"}
    </Button>
  );
}
