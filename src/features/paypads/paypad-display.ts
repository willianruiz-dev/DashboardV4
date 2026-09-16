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
