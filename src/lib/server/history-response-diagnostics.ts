import "server-only";

import { loadHistoryEnvelopeSchema, tonnageHistoryEnvelopeSchema } from "@/features/paypads/schemas";

type HistoryEndpoint = "loads" | "tonnages";
type ValueKind = "array" | "boolean" | "null" | "number" | "object" | "string" | "undefined";
type FieldValueKind = ValueKind | "absent";

interface FieldKindSummary {
  [kind: string]: number;
}

interface RowShapeSummary {
  detailFields: Record<string, FieldKindSummary>;
  detailRowKinds: FieldKindSummary;
  inspectedRows: number;
  recordFields: Record<string, FieldKindSummary>;
  recordKeys: string[];
  recordRowKinds: FieldKindSummary;
  responseTruncated: boolean;
}

interface PayloadShapeSummary {
  response: {
    kind: ValueKind;
    length: number | null;
    rows: RowShapeSummary | null;
  } | null;
  rootKeys: string[];
  rootKind: ValueKind;
}

interface SanitizedValidationIssue {
  code: string;
  path: string;
}

export interface HistoryResponseDiagnostic {
  contentType: string | null;
  endpoint: HistoryEndpoint;
  jsonReadable: boolean;
  shape: PayloadShapeSummary;
  status: number;
  validationIssues: SanitizedValidationIssue[];
}

const MAX_INSPECTED_ROWS = 250;
const MAX_ISSUES = 20;
const MAX_ROOT_KEYS = 30;

const endpointFields: Record<HistoryEndpoint, { detail: readonly string[]; record: readonly string[] }> = {
  loads: {
    detail: ["denominationValue", "idCurrencyDenomination", "quantity"],
    record: ["dateCreated", "details", "id", "totalLoaded"],
  },
  tonnages: {
    detail: ["denominationValue", "idCurrencyDenomination", "quantityAp", "quantityDp", "quantityRj", "quantityTotal"],
    record: ["dateCreated", "details", "id", "total", "totalAp", "totalDp", "totalRj"],
  },
};

function getValueKind(value: unknown): ValueKind {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "undefined":
      return "undefined";
    default:
      return "object";
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function incrementCount(summary: Record<string, FieldKindSummary>, field: string, kind: FieldValueKind): void {
  const fieldSummary = summary[field] ?? {};
  fieldSummary[kind] = (fieldSummary[kind] ?? 0) + 1;
  summary[field] = fieldSummary;
}

function countKnownFields(record: Record<string, unknown>, fields: readonly string[], summary: Record<string, FieldKindSummary>): void {
  for (const field of fields) {
    const kind: FieldValueKind = Object.hasOwn(record, field) ? getValueKind(record[field]) : "absent";
    incrementCount(summary, field, kind);
  }
}

function incrementKind(summary: FieldKindSummary, kind: ValueKind): void {
  summary[kind] = (summary[kind] ?? 0) + 1;
}

function sortKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort((left, right) => left.localeCompare(right)).slice(0, MAX_ROOT_KEYS);
}

function summarizeRows(rows: readonly unknown[], endpoint: HistoryEndpoint): RowShapeSummary {
  const fields = endpointFields[endpoint];
  const detailFields: Record<string, FieldKindSummary> = {};
  const detailRowKinds: FieldKindSummary = {};
  const recordFields: Record<string, FieldKindSummary> = {};
  const recordKeys = new Set<string>();
  const recordRowKinds: FieldKindSummary = {};
  const inspectedRows = Math.min(rows.length, MAX_INSPECTED_ROWS);

  for (const row of rows.slice(0, inspectedRows)) {
    incrementKind(recordRowKinds, getValueKind(row));
    const record = getRecord(row);

    if (!record) {
      continue;
    }

    for (const key of Object.keys(record)) {
      if (recordKeys.size < MAX_ROOT_KEYS) {
        recordKeys.add(key);
      }
    }

    countKnownFields(record, fields.record, recordFields);

    const details = record.details;
    if (!Array.isArray(details)) {
      continue;
    }

    for (const detail of details) {
      incrementKind(detailRowKinds, getValueKind(detail));
      const detailRecord = getRecord(detail);
      if (detailRecord) {
        countKnownFields(detailRecord, fields.detail, detailFields);
      }
    }
  }

  return {
    detailFields,
    detailRowKinds,
    inspectedRows,
    recordFields,
    recordKeys: [...recordKeys].sort((left, right) => left.localeCompare(right)),
    recordRowKinds,
    responseTruncated: rows.length > inspectedRows,
  };
}

function summarizePayload(payload: unknown, endpoint: HistoryEndpoint): PayloadShapeSummary {
  const root = getRecord(payload);
  const response = root?.response;

  if (!root) {
    return {
      response: null,
      rootKeys: [],
      rootKind: getValueKind(payload),
    };
  }

  return {
    response: {
      kind: getValueKind(response),
      length: Array.isArray(response) ? response.length : null,
      rows: Array.isArray(response) ? summarizeRows(response, endpoint) : null,
    },
    rootKeys: sortKeys(root),
    rootKind: "object",
  };
}

function sanitizeIssuePath(path: readonly PropertyKey[]): string {
  return path.length === 0
    ? "<root>"
    : path.map((segment) => typeof segment === "number" ? "[]" : String(segment)).join(".");
}

function getValidationIssues(endpoint: HistoryEndpoint, payload: unknown, jsonReadable: boolean): SanitizedValidationIssue[] {
  if (!jsonReadable) {
    return [{ code: "invalid_json", path: "<root>" }];
  }

  const schema = endpoint === "loads" ? loadHistoryEnvelopeSchema : tonnageHistoryEnvelopeSchema;
  const result = schema.safeParse(payload);

  return result.success
    ? []
    : result.error.issues.slice(0, MAX_ISSUES).map((issue) => ({
      code: issue.code,
      path: sanitizeIssuePath(issue.path),
    }));
}

export function createHistoryResponseDiagnostic(
  endpoint: HistoryEndpoint,
  { contentType, jsonReadable, payload, status }: {
    contentType: string | null;
    jsonReadable: boolean;
    payload: unknown;
    status: number;
  },
): HistoryResponseDiagnostic {
  return {
    contentType,
    endpoint,
    jsonReadable,
    shape: summarizePayload(payload, endpoint),
    status,
    validationIssues: getValidationIssues(endpoint, payload, jsonReadable),
  };
}

function isHistoryDiagnosticsEnabled(): boolean {
  return process.env.DASHBOARD_HISTORY_DIAGNOSTICS === "true";
}

export function getHistoryEndpoint(pathSegments: readonly string[]): HistoryEndpoint | null {
  const normalizedPath = pathSegments.map((segment) => segment.toLowerCase());

  if (
    normalizedPath.length === 4
    && normalizedPath[0] === "api"
    && normalizedPath[1] === "load"
    && normalizedPath[2] === "getbypaypad"
  ) {
    return "loads";
  }

  if (
    normalizedPath.length === 4
    && normalizedPath[0] === "api"
    && normalizedPath[1] === "tonnage"
    && normalizedPath[2] === "getbypaypad"
  ) {
    return "tonnages";
  }

  return null;
}

/**
 * This diagnostic is opt-in and deliberately emits only field names, JSON kinds,
 * collection sizes and sanitized Zod paths. It never logs response values,
 * authorization headers, cookies, tokens, or request bodies.
 */
export async function logHistoryResponseDiagnostic(endpoint: HistoryEndpoint | null, response: Response): Promise<void> {
  if (!endpoint || !isHistoryDiagnosticsEnabled()) {
    return;
  }

  try {
    let jsonReadable = true;
    let payload: unknown;

    try {
      payload = await response.clone().json() as unknown;
    } catch {
      jsonReadable = false;
    }

    const diagnostic = createHistoryResponseDiagnostic(endpoint, {
      contentType: response.headers.get("content-type"),
      jsonReadable,
      payload,
      status: response.status,
    });

    console.warn("[dashboard-history-diagnostic]", JSON.stringify(diagnostic));
  } catch {
    // Diagnostics are never allowed to alter a proxied API response.
    console.warn("[dashboard-history-diagnostic] Unable to inspect the history response safely.");
  }
}
