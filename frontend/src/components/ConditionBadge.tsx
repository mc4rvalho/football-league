import { Badge } from "./ui";

export function ConditionBadge({ condition }: { condition: string }) {
  const tone =
    condition === "APTO"
      ? "success"
      : condition === "DOENTE"
        ? "danger"
        : "warning";
  const label =
    condition === "APTO"
      ? "Apto"
      : condition === "DOENTE"
        ? "Doente"
        : "Mal condicionado";
  return <Badge tone={tone}>{label}</Badge>;
}
