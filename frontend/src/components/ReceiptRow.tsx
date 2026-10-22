import type { ReactNode } from "react";

export function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "receipt-row strong" : "receipt-row"}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
