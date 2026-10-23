import { Fragment, useState } from "react";
import type { Club, Duel, Match } from "../lib/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  LoadError,
  LoadingState,
  Select,
} from "../components/ui";
import { PageHeading } from "../components/PageHeading";
import { Icon } from "../components/Icon";
import { dateTime } from "../components/formatters";

const clubMark = (name: string) =>
  name
    .split(/\s+/)
    .find((part) => !["FC", "EC", "Clube", "Futebol"].includes(part))
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    ?.slice(0, 3)
    .toUpperCase() ?? "FC";

export function MatchesView({
  clubs,
  matches,
  loading,
  loadError,
  onRetry,
  onNew,
  onDetails,
}: {
  clubs: Club[];
  matches: Match[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
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
        action={
          <Button onClick={onNew}>
            <Icon name="plus" size={14} /> Nova partida
          </Button>
        }
        icon="swords"
      />
      {loading ? (
        <Card className="table-card">
          <LoadingState label="Carregando partidas" rows={5} />
        </Card>
      ) : loadError ? (
        <Card className="table-card">
          <LoadError
            title="Não foi possível carregar as partidas"
            error={loadError}
            onRetry={onRetry}
          />
        </Card>
      ) : (
        <>
          {latest && (
            <>
              <p className="latest-match-caption">Última partida</p>
              <Card className="latest-match">
                <div className="latest-match-team home">
                  <b>{latest.home.club_name}</b>
                  <span>Mandante</span>
                </div>
                <span className="club-mark">
                  {clubMark(latest.home.club_name)}
                </span>
                <div className="latest-match-score">
                  <strong>
                    {latest.home.goals} × {latest.away.goals}
                  </strong>
                  <small>{dateTime(latest.played_at)}</small>
                  <span className="latest-result">{latest.result}</span>
                </div>
                <span className="club-mark">
                  {clubMark(latest.away.club_name)}
                </span>
                <div className="latest-match-team away">
                  <b>{latest.away.club_name}</b>
                  <span>Visitante</span>
                </div>
                <Button variant="outline" onClick={() => onDetails(latest)}>
                  Ver duelos <Icon name="chevron-right" size={13} />
                </Button>
              </Card>
            </>
          )}
          <Card className="table-card">
            <div className="section-head">
              <div>
                <h2>Histórico de partidas</h2>
                <p className="muted">Da mais recente para a mais antiga.</p>
              </div>
              <label className="match-filter-control">
                <Icon name="shield" size={13} />
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Clube: todos</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
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
                      <td className="match-date-cell">
                        {dateTime(m.played_at).replace(",", "")}
                      </td>
                      <td>
                        <b>{m.home.club_name}</b>{" "}
                        <small className="club-code">
                          {clubMark(m.home.club_name)}
                        </small>
                      </td>
                      <td>
                        <b className="match-score-cell">
                          {m.home.goals} × {m.away.goals}
                        </b>
                      </td>
                      <td>
                        <small className="club-code">
                          {clubMark(m.away.club_name)}
                        </small>{" "}
                        <b>{m.away.club_name}</b>
                      </td>
                      <td>
                        <Badge>{m.result}</Badge>
                      </td>
                      <td>
                        <Button variant="outline" onClick={() => onDetails(m)}>
                          Ver duelos <Icon name="chevron-right" size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!!visible.length && (
                <div className="match-table-footer">
                  {visible.length}{" "}
                  {visible.length === 1 ? "partida" : "partidas"}
                </div>
              )}
              {!visible.length && (
                <Empty
                  title="Nenhuma partida jogada"
                  detail="Escale os titulares dos dois clubes e jogue a primeira partida. O resultado aparece aqui e na classificação."
                  action={
                    <Button onClick={onNew}>
                      <Icon name="plus" size={14} /> Nova partida
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
          <p className="matches-footnote">
            Partidas da mais recente para a mais antiga, com filtro por clube.
            “Ver duelos” abre a partida.
          </p>
        </>
      )}
    </>
  );
}
export function MatchDetailView({
  match,
  onBack,
}: {
  match: Match;
  onBack: () => void;
}) {
  return (
    <div className="match-detail-page">
      <div className="match-back-row">
        <Button variant="ghost" onClick={onBack}>
          <Icon name="chevron-right" size={14} className="back-chevron" />{" "}
          Voltar para partidas
        </Button>
      </div>
      <MatchResult match={match} />
    </div>
  );
}

export function MatchResult({
  match: m,
  showScoreboard = true,
}: {
  match: Match;
  showScoreboard?: boolean;
}) {
  const duels = [...(m.duels ?? [])].sort((a, b) => a.order - b.order);
  const teamPlayers = (clubId: number) => {
    const attackers = duels
      .filter((duel) => duel.attacking_club_id === clubId)
      .map((duel) => ({ ...duel.attacker, goal: duel.goal }));
    const defenders = duels
      .filter((duel) => duel.attacking_club_id !== clubId)
      .map((duel) => ({ ...duel.defender, goal: false }));
    return [...attackers, ...defenders].filter(
      (player, index, all) =>
        all.findIndex(
          (candidate) => candidate.player_id === player.player_id,
        ) === index,
    );
  };
  const homePlayers = teamPlayers(m.home.club_id);
  const awayPlayers = teamPlayers(m.away.club_id);
  const playerTop = (
    team: typeof homePlayers,
    player: (typeof homePlayers)[number],
  ) => {
    if (player.position === "GOL" || player.position === "MEI") return 50;
    const role = ["ZAG", "LAT"].includes(player.position)
      ? "DEF"
      : player.position;
    const sameRole = team.filter(
      (candidate) =>
        (["ZAG", "LAT"].includes(candidate.position)
          ? "DEF"
          : candidate.position) === role,
    );
    return sameRole.length > 1 && sameRole.indexOf(player) > 0 ? 70 : 30;
  };
  const playerDepth = (position: string) =>
    position === "GOL"
      ? 6
      : position === "MEI"
        ? 31
        : position === "ATA"
          ? 42
          : 18;
  return (
    <div className="match-result">
      {showScoreboard && (
        <div className="scoreboard">
          <div className="scoreboard-team home">
            <span>
              <b>{m.home.club_name}</b>
              <small>Mandante · {m.home.formation}</small>
            </span>
            <strong className="club-mark">{clubMark(m.home.club_name)}</strong>
          </div>
          <div className="scoreboard-result">
            <strong>
              {m.home.goals} × {m.away.goals}
            </strong>
            <small>{dateTime(m.played_at)}</small>
            <Badge>{m.result}</Badge>
          </div>
          <div className="scoreboard-team away">
            <strong className="club-mark">{clubMark(m.away.club_name)}</strong>
            <span>
              <b>{m.away.club_name}</b>
              <small>Visitante · {m.away.formation}</small>
            </span>
          </div>
        </div>
      )}
      <section className="match-field-card">
        <div className="section-head">
          <div>
            <h3>Em campo</h3>
            <p className="muted">
              Titulares e atributos usados nos duelos, já com o efeito da
              condição.
            </p>
          </div>
          <span className="match-legend">
            <Badge tone="warning">Mal condicionado</Badge> ⚽ Gol no duelo
          </span>
        </div>
        <div className="match-pitch">
          <span className="pitch-boundary" />
          <span className="pitch-goal pitch-goal-left" />
          <span className="pitch-goal pitch-goal-right" />
          <span className="pitch-halfway" />
          <span className="pitch-center-circle" />
          <span className="pitch-box pitch-box-left" />
          <span className="pitch-box pitch-box-right" />
          <div className="match-team-name home">
            {m.home.club_name} · ataca →
          </div>
          <div className="match-team-name away">
            ← ataca · {m.away.club_name}
          </div>
          {homePlayers.map((player) => (
            <div
              className={`match-player home-player ${player.condition === "MAL_CONDICIONADO" ? "unfit" : ""}`}
              style={{
                top: `${playerTop(homePlayers, player)}%`,
                left: `${playerDepth(player.position)}%`,
              }}
              key={`home-${player.player_id}`}
            >
              <span>{player.player_name.slice(0, 2).toUpperCase()}</span>
              {player.goal && <i>⚽</i>}
              <small>{player.player_name}</small>
              <em>
                {player.position} · {player.attribute} {player.value}
              </em>
            </div>
          ))}
          {awayPlayers.map((player) => (
            <div
              className={`match-player away-player ${player.condition === "MAL_CONDICIONADO" ? "unfit" : ""}`}
              style={{
                top: `${playerTop(awayPlayers, player)}%`,
                right: `${playerDepth(player.position)}%`,
              }}
              key={`away-${player.player_id}`}
            >
              <span>{player.player_name.slice(0, 2).toUpperCase()}</span>
              {player.goal && <i>⚽</i>}
              <small>{player.player_name}</small>
              <em>
                {player.position} · {player.attribute} {player.value}
              </em>
            </div>
          ))}
        </div>
      </section>
      <section className="duels-card">
        <header className="duels-heading">
          <h3>Duelos</h3>
          <p className="muted duel-rules">
            Os 3 ataques do mandante e depois os 3 do visitante. Os jogadores de
            linha vão do 1º (o mais recuado) ao 4º (o mais avançado): o 4º ataca
            o goleiro, o 3º o 1º e o 2º o 2º defensor.
          </p>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Duelo</th>
                <th>Atacante</th>
                <th>Ataque</th>
                <th>Defensor</th>
                <th>Defesa</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {duels.map((d: Duel, index) => (
                <Fragment key={d.order}>
                  {(index === 0 ||
                    duels[index - 1].attacking_club_id !==
                      d.attacking_club_id) && (
                    <tr className="duel-team-row">
                      <td colSpan={6}>
                        <small className="club-code">
                          {d.attacking_club_id === m.home.club_id
                            ? clubMark(m.home.club_name)
                            : clubMark(m.away.club_name)}
                        </small>{" "}
                        Ataques{" "}
                        {d.attacking_club_id === m.home.club_id
                          ? m.home.club_name
                          : m.away.club_name}{" "}
                        (
                        {d.attacking_club_id === m.home.club_id
                          ? "mandante"
                          : "visitante"}
                        )
                        <span>
                          {
                            duels
                              .filter(
                                (duel) =>
                                  duel.attacking_club_id ===
                                  d.attacking_club_id,
                              )
                              .filter((duel) => duel.goal).length
                          }{" "}
                          gols
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <span className="duel-number">{d.order}</span>
                    </td>
                    <td>
                      <span
                        className={`duel-player-cell ${d.attacking_club_id === m.home.club_id ? "home" : "away"}`}
                      >
                        <i>
                          {d.attacker.player_name.slice(0, 2).toUpperCase()}
                        </i>
                        <span>
                          <b>{d.attacker.player_name}</b>
                          <small>
                            {d.attacker.position},{" "}
                            {d.order <= 3 ? 5 - d.order : 8 - d.order}º de linha
                            ·{" "}
                            {d.attacking_club_id === m.home.club_id
                              ? m.home.club_name
                              : m.away.club_name}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>
                      {d.attacker.attribute} <b>{d.attacker.value}</b>
                    </td>
                    <td>
                      <span
                        className={`duel-player-cell ${d.attacking_club_id === m.home.club_id ? "away" : "home"}`}
                      >
                        <i>
                          {d.defender.player_name.slice(0, 2).toUpperCase()}
                        </i>
                        <span>
                          <b>{d.defender.player_name}</b>
                          <small>
                            {d.defender.position} ·{" "}
                            {d.attacking_club_id === m.home.club_id
                              ? m.away.club_name
                              : m.home.club_name}
                          </small>
                        </span>
                      </span>
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
                </Fragment>
              ))}
            </tbody>
          </table>
          {!m.duels?.length && (
            <p className="muted">
              A API ainda não retornou os duelos desta partida.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
