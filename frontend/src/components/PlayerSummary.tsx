import type { Player } from "../lib/types";
import { initials, money } from "./formatters";
import { Badge } from "./ui";
import { ConditionBadge } from "./ConditionBadge";

export function PlayerSummary({ player }: { player: Player }) {
  return (
    <div className="player-summary">
      <span className="avatar">{initials(player.name)}</span>
      <div>
        <b>{player.name}</b>
        <small>
          {player.position} · {player.age} anos
        </small>
      </div>
      <div className="player-summary-badges">
        <ConditionBadge condition={player.condition} />
        {player.club_id === null && <Badge>Livre</Badge>}
      </div>
      <b className="summary-value">{money(player.market_value)}</b>
    </div>
  );
}
