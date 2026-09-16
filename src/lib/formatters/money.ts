function parseDecimal(value: string): { fraction: string; integer: string; negative: boolean } | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    fraction: (match[3] ?? "").slice(0, 2).padEnd(2, "0"),
    integer: match[2] ?? "0",
    negative: match[1] === "-",
  };
}

function decimalToCents(value: string): bigint | null {
  const parsed = parseDecimal(value);
  if (!parsed) {
    return null;
  }

  const cents = BigInt(parsed.integer) * 100n + BigInt(parsed.fraction);
  return parsed.negative ? -cents : cents;
}

function centsToDecimal(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");

  return fraction === "00" ? `${negative ? "-" : ""}${integer.toString()}` : `${negative ? "-" : ""}${integer.toString()}.${fraction}`;
}

export function formatDashboardMoney(value: string, currency = "USD"): string {
  const cents = decimalToCents(value);
  if (cents === null) {
    return value;
  }

  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const formattedInteger = new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(integer);

  return fraction === "00" ? (negative ? `-${formattedInteger}` : formattedInteger) : `${negative ? "-" : ""}${formattedInteger}.${fraction}`;
}

export function sumMoneyStrings(values: readonly string[]): string {
  const total = values.reduce<bigint | null>((current, value) => {
    const cents = decimalToCents(value);
    return current === null || cents === null ? null : current + cents;
  }, 0n);

  return total === null ? "0" : centsToDecimal(total);
}

export function multiplyMoneyString(value: string, quantity: string): string {
  const cents = decimalToCents(value);
  if (cents === null || !/^\d+$/.test(quantity)) {
    return "0";
  }

  return centsToDecimal(cents * BigInt(quantity));
}

export function compareMoneyStrings(left: string, right: string): number {
  const leftCents = decimalToCents(left);
  const rightCents = decimalToCents(right);
  if (leftCents === null || rightCents === null) {
    return left.localeCompare(right);
  }
  return leftCents === rightCents ? 0 : leftCents > rightCents ? 1 : -1;
}

export function subtractMoneyStrings(left: string, right: string): string {
  const leftCents = decimalToCents(left);
  const rightCents = decimalToCents(right);
  return leftCents === null || rightCents === null ? "0" : centsToDecimal(leftCents - rightCents);
}
