import type { Player } from "../lib/types";
import { initials, money } from "./formatters";

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
      <b className="summary-value">{money(player.market_value)}</b>
    </div>
  );
}
