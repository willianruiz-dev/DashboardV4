import type { PayPad } from "@/features/paypads/schemas";

/**
 * The legacy UI identifies every machine with `username`. Some deployed payloads
 * retain the historical `userName` spelling, so normalize that alias without ever
 * substituting the machine description.
 */
export function getPaypadMachineName(paypad: Pick<PayPad, "userName" | "username"> | null | undefined): string | null {
  return paypad?.username?.trim() || paypad?.userName?.trim() || null;
}

/**
 * Use only in presentation. Forms must use `getPaypadMachineName` so a display
 * fallback is never persisted as a machine username.
 */
export function getPaypadDisplayName(paypad: Pick<PayPad, "id" | "userName" | "username"> | null | undefined): string {
  return getPaypadMachineName(paypad) || (paypad ? `Pay+ ${paypad.id}` : "Pay+");
}

/**
 * Transaction DTOs carry a `paypad` display field whose source is not the machine
 * username. Prefer the username resolved from the PayPad list and never present a
 * description as the machine name.
 */
export function getResolvedPaypadMachineName(paypadUsername: string | null | undefined, id: number): string {
  return paypadUsername?.trim() || `Pay+ ${id}`;
}
