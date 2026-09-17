"use client";

import { z } from "zod";

import { roleSchema } from "@/features/auth/schemas";
import {
  lookupClientSchema,
  lookupCurrencySchema,
  lookupOfficeSchema,
  lookupRegionSchema,
  lookupTypeDocumentSchema,
} from "@/features/lookups/schemas";
import { requestBackendApi } from "@/lib/api/backend";

export const lookupQueryKeys = {
  all: ["lookups"] as const,
  clients: () => ["lookups", "clients"] as const,
  currencies: () => ["lookups", "currencies"] as const,
  offices: (clientId: number | null) => ["lookups", "offices", clientId ?? "all"] as const,
  regions: () => ["lookups", "regions"] as const,
  roles: () => ["lookups", "roles"] as const,
  typeDocuments: () => ["lookups", "type-documents"] as const,
};

export function getLookupClients() {
  return requestBackendApi(["api", "Client"], z.array(lookupClientSchema));
}

export function getLookupRoles() {
  return requestBackendApi(["api", "Role"], z.array(roleSchema));
}

export function getLookupTypeDocuments() {
  return requestBackendApi(["api", "Masters", "TypeDocument"], z.array(lookupTypeDocumentSchema));
}

export function getLookupRegions() {
  return requestBackendApi(["api", "Masters", "Region"], z.array(lookupRegionSchema));
}

export function getLookupCurrencies() {
  return requestBackendApi(["api", "Masters", "Currency"], z.array(lookupCurrencySchema));
}

export function getLookupOffices(clientId: number | null) {
  const segments = clientId === null ? ["api", "Office"] : ["api", "Office", "Client", clientId];
  return requestBackendApi(segments, z.array(lookupOfficeSchema));
}
