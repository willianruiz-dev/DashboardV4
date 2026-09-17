"use client";

import { z } from "zod";

import type { AlertSubscriptionCreate } from "@/features/alerts/schemas";
import { subscriptionSchema } from "@/features/alerts/schemas";
import { ClientApiError } from "@/lib/api/client";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

async function emptyWhenNotFound<T>(request: Promise<T>): Promise<T | []> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export const alertQueryKeys = {
  all: ["alerts"] as const,
  subscriptions: (paypadId: number) => ["alerts", "subscriptions", paypadId] as const,
};

export function getSubscriptionsByPaypad(paypadId: number) {
  return emptyWhenNotFound(requestBackendApi(["api", "Alerts", "Subscription", "GetByPayPad", paypadId], z.array(subscriptionSchema)));
}

export function createSubscription(payload: AlertSubscriptionCreate) {
  return sendBackendJson(["api", "Alerts", "Subscription"], "POST", payload, subscriptionSchema);
}

export function deleteSubscription(id: number): Promise<void> {
  return deleteBackendResource(["api", "Alerts", "Subscription", id]);
}
