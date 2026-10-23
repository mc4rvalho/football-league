import type { Match, Standing } from "../lib/types";
import { Button, Card, Empty, LoadError, LoadingState } from "../components/ui";
import { PageHeading } from "../components/PageHeading";
import { Icon } from "../components/Icon";
import { dateTime } from "../components/formatters";

const clubCode = (name: string) =>
  name
    .split(/\s+/)
    .find((part) => !["FC", "EC", "Clube", "Futebol"].includes(part))
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    ?.slice(0, 3)
    .toUpperCase() ?? "FC";

export function StandingsView({
  rows,
  matches,
  loading,
  loadError,
  onRetry,
  onNew,
  onMatches,
  onDetails,
}: {
  rows: Standing[];
  matches: Match[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onNew: () => void;
  onMatches: () => void;
  onDetails: (match: Match) => void;
}) {
  return (
    <>
      <PageHeading
        title="Classificação"
        subtitle="Todos os clubes, com 3 pontos por vitória e 1 por empate."
        action={
          <Button variant="outline" onClick={onNew}>
            <Icon name="plus" size={14} /> Nova partida
          </Button>
        }
        icon="list-ordered"
      />
      {loading ? (
        <Card className="table-card">
          <LoadingState label="Carregando classificação" rows={6} />
        </Card>
      ) : loadError ? (
        <Card className="table-card">
          <LoadError
            title="Não foi possível carregar a classificação"
            error={loadError}
            onRetry={onRetry}
          />
        </Card>
      ) : (
        <>
          <div className="standings-grid">
            <Card className="table-card standings-table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Clube</th>
                      <th>J</th>
                      <th>V</th>
                      <th>E</th>
                      <th>D</th>
                      <th>GP</th>
                      <th>GC</th>
                      <th>SG</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.club_id}>
                        <td>
                          <span
                            className={r.position === 1 ? "rank first" : "rank"}
                          >
                            {r.position}
                          </span>
                        </td>
                        <td>
                          <span className="club-code">
                            {clubCode(r.club_name)}
                          </span>{" "}
                          <span className="standings-club-link">
                            {r.club_name}
                          </span>
                        </td>
                        <td>{r.played}</td>
                        <td>{r.wins}</td>
                        <td>{r.draws}</td>
                        <td>{r.losses}</td>
                        <td>{r.goals_for}</td>
                        <td>{r.goals_against}</td>
                        <td>
                          {r.goal_difference > 0 ? "+" : ""}
                          {r.goal_difference}
                        </td>
                        <td>
                          <b>{r.points}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <Empty
                    title="Nenhum clube cadastrado"
                    detail="A classificação aparece quando houver clubes cadastrados."
                  />
                )}
              </div>
              <p className="footnote standings-legend">
                J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols pró
                · GC: gols contra · SG: saldo de gols · Pts: pontos
              </p>
            </Card>
            <div className="standings-aside">
              <Card className="panel recent-matches-panel">
                <div className="standings-panel-head">
                  <h2>Últimas partidas</h2>
                  <p className="muted">Da mais recente para a mais antiga.</p>
                </div>
                {matches.slice(0, 3).map((match) => (
                  <button
                    className="recent-match-link"
                    key={match.id}
                    onClick={() => onDetails(match)}
                  >
                    <small>{dateTime(match.played_at)}</small>
                    <span>
                      <b>{match.home.club_name}</b>
                      <strong>
                        {match.home.goals} × {match.away.goals}
                      </strong>
                      <b>{match.away.club_name}</b>
                    </span>
                  </button>
                ))}
                {!matches.length && (
                  <p className="muted">Nenhuma partida ainda.</p>
                )}
                <Button variant="ghost" onClick={onMatches}>
                  Ver todas as partidas <Icon name="chevron-right" size={13} />
                </Button>
              </Card>
              <Card className="panel">
                <div className="standings-panel-head">
                  <h2>Ordem da tabela</h2>
                  <p className="muted">
                    Critérios de classificação, nesta ordem.
                  </p>
                </div>
                <ol className="ranking-rules">
                  <li>Mais pontos</li>
                  <li>Maior saldo de gols</li>
                  <li>Mais gols marcados</li>
                  <li>Nome do clube, de A a Z</li>
                </ol>
              </Card>
            </div>
          </div>
          <p className="standings-footnote">
            Classificação de 1 a {rows.length}, com os clubes sem partidas
            zerados. Pontos, saldo e posição são calculados a cada consulta,
            nunca gravados (RN21).
          </p>
        </>
      )}
    </>
  );
}
