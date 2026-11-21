const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 48200 → "48.2K", 1100000 → "1.1M". */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value < 1000) return String(Math.max(0, Math.round(value)));
  return compactFormatter.format(value);
}
