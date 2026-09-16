"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getLookupClients,
  getLookupCurrencies,
  getLookupOffices,
  getLookupRegions,
  getLookupRoles,
  getLookupTypeDocuments,
  lookupQueryKeys,
} from "@/features/lookups/api";

export function useLookupClients(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getLookupClients,
    queryKey: lookupQueryKeys.clients(),
  });
}

export function useLookupRoles() {
  return useQuery({
    queryFn: getLookupRoles,
    queryKey: lookupQueryKeys.roles(),
  });
}

export function useLookupTypeDocuments() {
  return useQuery({
    queryFn: getLookupTypeDocuments,
    queryKey: lookupQueryKeys.typeDocuments(),
  });
}

export function useLookupRegions() {
  return useQuery({
    queryFn: getLookupRegions,
    queryKey: lookupQueryKeys.regions(),
  });
}

export function useLookupCurrencies() {
  return useQuery({
    queryFn: getLookupCurrencies,
    queryKey: lookupQueryKeys.currencies(),
  });
}

export function useLookupOffices(clientId: number | null, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => getLookupOffices(clientId),
    queryKey: lookupQueryKeys.offices(clientId),
  });
}
