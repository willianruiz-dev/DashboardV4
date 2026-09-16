function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeInputValue(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function createTodayDateRange(): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 0, 0);
  return {
    from: toLocalDateTimeInputValue(from),
    to: toLocalDateTimeInputValue(to),
  };
}

export function localDateTimeToApiIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDashboardDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${value.replace("T", " ")} (zona no informada)`;
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZoneName: "short",
    year: "numeric",
  }).format(date);
}

export function dateForFileName(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 8) || "sin_fecha";
}
