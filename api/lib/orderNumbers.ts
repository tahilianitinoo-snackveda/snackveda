// Formatting only. The sequence is supplied by the caller, which counts existing rows —
// a known race against the UNIQUE constraint on orders.order_number, fixed in its own plan.
export function formatOrderNumber(type: "b2c" | "b2b", year: number, sequence: number): string {
  return `ND-${type.toUpperCase()}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}
