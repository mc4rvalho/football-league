import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeading({
  title,
  subtitle,
  action,
  icon = "users",
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  icon?: "users" | "shield" | "swords" | "list-ordered";
}) {
  return (
    <div className="page-heading">
      <div className="heading-icon">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
