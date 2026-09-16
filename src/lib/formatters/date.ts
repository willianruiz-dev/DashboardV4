function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeInputValue(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function createTodayDateRange(now = new Date()): { from: string; to: string } {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  // `datetime-local` has minute precision in this UI. The API still receives the
  // legacy end-of-day value through `localDateTimeToApiIso(..., { endOfMinute: true })`.
  to.setHours(23, 59, 0, 0);
  return {
    from: toLocalDateTimeInputValue(from),
    to: toLocalDateTimeInputValue(to),
  };
}

export function localDateTimeToApiIso(value: string, options: { endOfMinute?: boolean } = {}): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (options.endOfMinute) {
    date.setSeconds(59, 999);
  }

  return date.toISOString();
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
