import type { Player } from "../lib/types";
import { initials, money } from "./formatters";
import { KpiCard } from "./KpiCard";
import { Badge } from "./ui";
import { ConditionBadge } from "./ConditionBadge";

export function PlayerDetails({
  player,
  clubName,
}: {
  player: Player;
  clubName?: string;
}) {
  const stats: [string, number][] = [
    ["Velocidade", player.pace],
    ["Finalização", player.shooting],
    ["Passe", player.passing],
    ["Drible", player.dribbling],
    ["Defesa", player.defending],
    ["Físico", player.physical],
  ];
  return (
    <div className="details-body">
      <div className="player-detail-identity">
        <span className="avatar">{initials(player.name)}</span>
        <div>
          <b>{player.name}</b>
          <div className="player-detail-badges">
            <Badge>{player.position}</Badge>
            <ConditionBadge condition={player.condition} />
            <Badge>
              {player.club_id === null ? "Livre" : (clubName ?? "Em clube")}
            </Badge>
          </div>
        </div>
      </div>
      <div className="kpi-grid">
        <KpiCard label="Valor de mercado" value={money(player.market_value)} />
        <KpiCard label="Valor base" value={money(player.base_value)} />
        <KpiCard label="Overall" value={player.overall} />
        <KpiCard label="Potencial" value={player.potential} />
      </div>
      <div className="player-detail-section-head">
        <h3>Indicadores técnicos</h3>
        <small>Escala de 1 a 99</small>
      </div>
      {stats.map(([label, value]) => (
        <div className="stat-row" key={label}>
          <span>{label}</span>
          <div className="progress">
            <i style={{ width: `${value}%` }} />
            <em
              style={{
                left: `${value}%`,
                width: `${Math.max(0, player.potential - value)}%`,
              }}
            />
          </div>
          <b>{value}</b>
        </div>
      ))}
      <div className="player-detail-meta">
        <div>
          <span>Idade</span>
          <b>{player.age} anos</b>
        </div>
        <div>
          <span>Agilidade</span>
          <b>{player.agility}</b>
        </div>
        <div>
          <span>Clube</span>
          <b>{player.club_id === null ? "Livre" : (clubName ?? "Em clube")}</b>
        </div>
      </div>
      <p className="player-detail-legend">
        <i /> Valor do atributo <i /> Até o potencial ({player.potential}), que
        nenhum atributo passa
      </p>
    </div>
  );
}
