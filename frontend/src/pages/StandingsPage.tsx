import type { Standing } from "../lib/types";
import { Button, Card, Empty } from "../components/ui";
import { PageHeading } from "../components/PageHeading";

export function StandingsView({
  rows,
  onNew,
  onMatches,
}: {
  rows: Standing[];
  onNew: () => void;
  onMatches: () => void;
}) {
  return (
    <>
      <PageHeading
        title="Classificação"
        subtitle="Todos os clubes, com 3 pontos por vitória e 1 por empate."
        action={
          <Button variant="outline" onClick={onNew}>
            ＋ Nova partida
          </Button>
        }
      />
      <div className="standings-grid">
        <Card className="table-card">
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
                      <b>{r.club_name}</b>
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
                detail="A classificação mostra todos os clubes, mesmo antes da primeira partida."
              />
            )}
          </div>
          <p className="footnote">
            J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols pró ·
            GC: gols contra · SG: saldo de gols · Pts: pontos
          </p>
        </Card>
        <Card className="panel">
          <h2>Ordem da tabela</h2>
          <ol className="ranking-rules">
            <li>Mais pontos</li>
            <li>Maior saldo de gols</li>
            <li>Mais gols marcados</li>
            <li>Nome do clube, de A a Z</li>
          </ol>
          <Button variant="outline" onClick={onMatches}>
            Ver partidas →
          </Button>
        </Card>
      </div>
    </>
  );
}
