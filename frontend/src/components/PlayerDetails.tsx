import type { Player } from "../lib/types";
import { money } from "./formatters";
import { KpiCard } from "./KpiCard";

export function PlayerDetails({ player }: { player: Player }) {
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
      <div className="kpi-grid">
        <KpiCard label="Valor de mercado" value={money(player.market_value)} />
        <KpiCard label="Valor base" value={money(player.base_value)} />
        <KpiCard label="Overall" value={player.overall} />
        <KpiCard label="Potencial" value={player.potential} />
      </div>
      <h3>Indicadores técnicos</h3>
      {stats.map(([label, value]) => (
        <div className="stat-row" key={label}>
          <span>{label}</span>
          <div className="progress">
            <i style={{ width: `${value}%` }} />
          </div>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}
