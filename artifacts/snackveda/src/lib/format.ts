import { format } from "date-fns";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return "—";
  }
}
