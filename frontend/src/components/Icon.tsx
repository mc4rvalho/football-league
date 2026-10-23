type IconName =
  | "users"
  | "shield"
  | "swords"
  | "list-ordered"
  | "plus"
  | "trophy"
  | "clock"
  | "refresh-cw"
  | "shopping-cart"
  | "history"
  | "hand-coins"
  | "chart-bar"
  | "user-round"
  | "search"
  | "ellipsis"
  | "pencil"
  | "heart-pulse"
  | "trash-2"
  | "chevron-right"
  | "chevron-down"
  | "chevrons-up-down"
  | "lock"
  | "tag"
  | "calendar-range"
  | "calendar"
  | "coins"
  | "shirt"
  | "circle-check"
  | "search-x"
  | "circle-alert"
  | "info"
  | "download"
  | "triangle-alert"
  | "layout-grid"
  | "circle-dot"
  | "x";

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`app-icon ${className}`}
      src={`/icons/${name}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
