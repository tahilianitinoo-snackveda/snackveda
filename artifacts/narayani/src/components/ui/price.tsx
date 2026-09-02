import { formatINR } from "@/lib/format";

interface PriceProps {
  amount: number;
  className?: string;
}

export function Price({ amount, className }: PriceProps) {
  return <span className={className}>{formatINR(amount)}</span>;
}
