import type { ReactNode } from "react";

export function KpiCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="kpi">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
