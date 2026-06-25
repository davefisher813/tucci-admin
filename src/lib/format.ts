export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

export function moneyExact(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

export function clock(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// "2:00 PM" style hour label from a 24h integer
export function hourLabel(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Format a phone number for display: "(203) 555-1234".
// Falls back to the raw string if it isn't a recognizable US number.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // 11-digit with leading country code 1
  const d = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 7) {
    return `${d.slice(0, 3)}-${d.slice(3)}`;
  }
  return raw; // not a standard US number, show as-is
}
