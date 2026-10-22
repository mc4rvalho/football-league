import { useState } from "react";
import type { Club, Duel, Match } from "../lib/types";
import { Badge, Button, Card, Empty, Select } from "../components/ui";
import { PageHeading } from "../components/PageHeading";
import { dateTime } from "../components/formatters";

export function MatchesView({
  clubs,
  matches,
  onNew,
  onDetails,
}: {
  clubs: Club[];
  matches: Match[];
  onNew: () => void;
  onDetails: (m: Match) => void;
}) {
  const [filter, setFilter] = useState("");
  const visible = matches.filter(
    (m) =>
      !filter ||
      m.home.club_id === Number(filter) ||
      m.away.club_id === Number(filter),
  );
  const latest = visible[0];
  return (
    <>
      <PageHeading
        title="Partidas"
        subtitle="Jogue partidas entre clubes com 5 titulares escalados e acompanhe o histórico."
        action={<Button onClick={onNew}>＋ Nova partida</Button>}
      />
      {latest && (
        <Card className="latest-match">
          <div>
            <small>Última partida</small>
            <h2>
              {latest.home.club_name}{" "}
              <span className="score">
                {latest.home.goals} × {latest.away.goals}
              </span>{" "}
              {latest.away.club_name}
            </h2>
            <p>{dateTime(latest.played_at)}</p>
          </div>
          <Button variant="outline" onClick={() => onDetails(latest)}>
            Ver duelos →
          </Button>
        </Card>
      )}
      <Card className="table-card">
        <div className="section-head">
          <div>
            <h2>Histórico de partidas</h2>
            <p className="muted">Da mais recente para a mais antiga.</p>
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Clube: todos</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Mandante</th>
                <th>Placar</th>
                <th>Visitante</th>
                <th>Resultado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id}>
                  <td>{dateTime(m.played_at)}</td>
                  <td>{m.home.club_name}</td>
                  <td>
                    <b>
                      {m.home.goals} × {m.away.goals}
                    </b>
                  </td>
                  <td>{m.away.club_name}</td>
                  <td>
                    <Badge>{m.result}</Badge>
                  </td>
                  <td>
                    <Button variant="outline" onClick={() => onDetails(m)}>
                      Ver duelos →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <Empty
              title="Nenhuma partida jogada"
              detail="Escale 5 titulares em dois clubes e jogue a primeira partida."
              action={<Button onClick={onNew}>＋ Nova partida</Button>}
            />
          )}
        </div>
      </Card>
    </>
  );
}
export function MatchResult({ match: m }: { match: Match }) {
  return (
    <div className="match-result">
      <div className="scoreboard">
        <div>
          <small>Mandante</small>
          <b>{m.home.club_name}</b>
          <Badge>{m.home.formation}</Badge>
        </div>
        <strong>
          {m.home.goals} × {m.away.goals}
        </strong>
        <div>
          <small>Visitante</small>
          <b>{m.away.club_name}</b>
          <Badge>{m.away.formation}</Badge>
        </div>
      </div>
      <h3>Duelo a duelo</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Atacante</th>
              <th>Atributo</th>
              <th>Defensor</th>
              <th>Defesa</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {m.duels?.map((d: Duel) => (
              <tr key={d.order}>
                <td>{d.order}</td>
                <td>
                  {d.attacker.player_name} · {d.attacker.position}
                </td>
                <td>
                  {d.attacker.attribute} <b>{d.attacker.value}</b>
                </td>
                <td>
                  {d.defender.player_name} · {d.defender.position}
                </td>
                <td>
                  {d.defender.attribute} <b>{d.defender.value}</b>
                </td>
                <td>
                  <Badge tone={d.goal ? "success" : "neutral"}>
                    {d.goal ? "Gol" : "Sem gol"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!m.duels?.length && (
          <p className="muted">
            A API ainda não retornou os duelos desta partida.
          </p>
        )}
      </div>
    </div>
  );
}
