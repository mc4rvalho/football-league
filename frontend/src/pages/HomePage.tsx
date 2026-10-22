import type { Club, Match } from "../lib/types";
import { Badge } from "../components/ui";

export type Section = "home" | "players" | "clubs" | "matches" | "standings";
export function Home({
  clubs,
  matches,
  onGo,
}: {
  clubs: Club[];
  matches: Match[];
  onGo: (s: Section) => void;
}) {
  return (
    <div className="welcome">
      <div className="welcome-logo">
        <span className="brand-mark">P</span>
        <b>Passe</b>
      </div>
      <Badge tone="success">Liga em andamento</Badge>
      <h1>Gestão da liga, do mercado à classificação</h1>
      <p className="lead">
        Cadastre jogadores, monte clubes e negocie com contrato de fidelidade.
        Depois, escale os titulares e jogue partidas com placar calculado pela
        API.
      </p>
      <div className="welcome-stats">
        <span>
          <b>{clubs.length}</b> clubes
        </span>
        <span>
          <b>Mercado</b> aberto
        </span>
        <span>
          <b>{matches.length}</b> partidas
        </span>
      </div>
      <div className="quick-grid">
        {(
          [
            [
              "players",
              "01",
              "Jogadores",
              "Cadastre, filtre e acompanhe o valor de mercado.",
            ],
            ["clubs", "02", "Clubes", "Crie clubes, gerencie caixa e elenco."],
            [
              "players",
              "03",
              "Compra e venda",
              "Negocie com contrato e histórico financeiro.",
            ],
            [
              "matches",
              "04",
              "Liga",
              "Escale titulares, jogue e veja a classificação.",
            ],
          ] as [Section, string, string, string][]
        ).map(([s, n, t, d]) => (
          <button className="quick-card" key={n} onClick={() => onGo(s)}>
            <span className="quick-num">{n}</span>
            <b>{t}</b>
            <small>{d}</small>
            <span className="quick-arrow">→</span>
          </button>
        ))}
      </div>
      <small className="muted">
        Valores calculados pelas regras do enunciado · Horário de Brasília
        (UTC−3)
      </small>
    </div>
  );
}
