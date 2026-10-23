import type { ReactNode } from "react";

export function ReceiptRow({
  label,
  value,
  description,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  description?: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "receipt-row strong" : "receipt-row"}>
      <span className="receipt-label">
        {label}
        {description && <small>{description}</small>}
      </span>
      <b>{value}</b>
    </div>
  );
}
