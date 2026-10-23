import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../services/api";
import type {
  Club,
  Lineup,
  Player,
  Position,
  TransactionHistory,
} from "../lib/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  LoadError,
  LoadingState,
  Select,
} from "../components/ui";
import { ConditionBadge } from "../components/ConditionBadge";
import { KpiCard } from "../components/KpiCard";
import { PageHeading } from "../components/PageHeading";
import {
  dateTime,
  initials,
  money,
  positionName,
} from "../components/formatters";
import { Icon } from "../components/Icon";

const formations = ["3-1", "2-2", "2-1-1", "1-2-1"];
const clubSortOptions = [
  { value: "name", label: "Nome" },
  { value: "net_worth_desc", label: "Patrimônio (maior para o menor)" },
  { value: "net_worth_asc", label: "Patrimônio (menor para o maior)" },
];

export function ClubsView({
  clubs,
  clubsLoading,
  clubsError,
  club,
  clubLoading,
  clubError,
  clubId,
  tab,
  setTab,
  onNew,
  onSelect,
  onMarket,
  onSell,
  lineupForm,
  setLineupForm,
  onSaveLineup,
  busy,
  actionError,
  onClearActionError,
  history,
  historyLoading,
  historyError,
  historyType,
  setHistoryType,
  historyPlayer,
  setHistoryPlayer,
  onExport,
  onRetry,
  onRetryHistory,
}: {
  clubs: Club[];
  clubsLoading: boolean;
  clubsError: string | null;
  club: (Club & { players: Player[] }) | null;
  clubLoading: boolean;
  clubError: string | null;
  clubId: number | null;
  tab: "roster" | "lineup" | "history";
  setTab: (v: "roster" | "lineup" | "history") => void;
  onNew: () => void;
  onSelect: (id: number) => void;
  onMarket: () => void;
  onSell: (p: Player) => void;
  lineupForm: { formation: string; player_ids: number[] };
  setLineupForm: (value: { formation: string; player_ids: number[] }) => void;
  onSaveLineup: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  actionError: string | null;
  onClearActionError: () => void;
  history: TransactionHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  historyType: string;
  setHistoryType: (v: string) => void;
  historyPlayer: string;
  setHistoryPlayer: (v: string) => void;
  onExport: () => void;
  onRetry: () => void;
  onRetryHistory: () => void;
}) {
  const [sort, setSort] = useState("net_worth_desc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [historyPlayerOpen, setHistoryPlayerOpen] = useState(false);
  const historyPlayerRef = useRef<HTMLDivElement>(null);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const activeHistoryTypes =
    historyType === "__NONE__" ? [] : historyType.split(",");
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false);
      if (!historyPlayerRef.current?.contains(event.target as Node))
        setHistoryPlayerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSortOpen(false);
        setHistoryPlayerOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  useEffect(() => {
    if (clubId)
      void api<Lineup>(`/clubs/${clubId}/lineup`)
        .then((result) => {
          setLineup(result);
          setLineupForm({
            formation: result.formation ?? "2-1-1",
            player_ids: result.players.map((player) => player.id),
          });
        })
        .catch(() => setLineup(null));
  }, [clubId, club, setLineupForm]);
  if (!clubId)
    return (
      <>
        <PageHeading
          title="Clubes"
          subtitle="Cada clube começa com 300,00 em caixa e sem jogadores. A liga aceita no máximo 20 clubes."
          action={
            <Button onClick={onNew}>
              <Icon name="plus" size={14} /> Novo clube
            </Button>
          }
          icon="shield"
        />
        {clubsLoading ? (
          <Card className="table-card">
            <LoadingState label="Carregando clubes" rows={6} />
          </Card>
        ) : clubsError ? (
          <Card className="table-card">
            <LoadError
              title="Não foi possível carregar os clubes"
              error={clubsError}
              onRetry={onRetry}
            />
          </Card>
        ) : clubs.length === 0 ? (
          <Card className="club-empty-card">
            <Empty
              title="Nenhum clube cadastrado"
              detail="Crie o primeiro clube com nome e sigla. Ele começa com 300,00 em caixa e sem jogadores."
              action={
                <Button variant="outline" onClick={onNew}>
                  <Icon name="plus" size={14} /> Novo clube
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="table-card club-list-card">
            <div className="table-toolbar">
              <div className="club-list-count">
                <b>{clubs.length} clubes</b>
                <Badge>{clubs.length} de 20</Badge>
              </div>
              <div className="club-sort-menu-wrap" ref={sortRef}>
                <Button
                  variant="outline"
                  className="club-sort-trigger"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((open) => !open)}
                >
                  <Icon name="list-ordered" size={14} />
                  Ordenar:{" "}
                  {clubSortOptions
                    .find((option) => option.value === sort)
                    ?.label.toLowerCase() ?? "nome"}
                  <Icon name="chevrons-up-down" size={12} />
                </Button>
                {sortOpen && (
                  <div className="player-sort-menu club-sort-menu" role="menu">
                    <small>Ordenar por</small>
                    {clubSortOptions.map((option) => (
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={sort === option.value}
                        className={sort === option.value ? "selected" : ""}
                        key={option.value}
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Clube</th>
                    <th>Sigla</th>
                    <th>Caixa</th>
                    <th>Valor do elenco</th>
                    <th>Patrimônio</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...clubs]
                    .sort(
                      sort === "name"
                        ? (a, b) => a.name.localeCompare(b.name)
                        : sort === "net_worth_desc"
                          ? (a, b) => b.net_worth - a.net_worth
                          : (a, b) => a.net_worth - b.net_worth,
                    )
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="club-name-cell">
                            <span className="club-avatar">
                              {c.acronym.slice(0, 1)}
                            </span>
                            <b>{c.name}</b>
                          </span>
                        </td>
                        <td>
                          <Badge>{c.acronym}</Badge>
                        </td>
                        <td>{money(c.cash)}</td>
                        <td>{money(c.squad_value)}</td>
                        <td>
                          <b>{money(c.net_worth)}</b>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            onClick={() => onSelect(c.id)}
                          >
                            Ver clube <Icon name="chevron-right" size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {clubs.length > 0 && (
          <p className="footnote">
            Clubes por patrimônio, do maior para o menor. Empates são desfeitos
            pelo nome.
          </p>
        )}
      </>
    );
  if (!club)
    return clubLoading ? (
      <Card>
        <LoadingState label="Carregando clube" rows={4} />
      </Card>
    ) : clubError ? (
      <Card>
        <LoadError
          title="Não foi possível carregar o clube"
          error={clubError}
          onRetry={onRetry}
        />
      </Card>
    ) : (
      <Empty
        title="Clube não encontrado"
        detail="O clube pode ter sido removido. Volte para a lista e tente de novo."
        action={
          <Button variant="outline" onClick={onRetry}>
            ↻ Tentar novamente
          </Button>
        }
      />
    );
  return (
    <>
      <div className="club-title">
        <div className="club-avatar large">{club.acronym}</div>
        <div>
          <h1>{club.name}</h1>
          <div className="title-badges">
            <Badge>{club.acronym}</Badge>
            <Badge>
              <Icon name="users" size={12} /> {club.players.length} de 12
              jogadores
            </Badge>
          </div>
        </div>
        <Button onClick={onMarket}>
          <Icon name="shopping-cart" size={14} /> Comprar jogadores
        </Button>
      </div>
      <div className="kpi-grid club-kpis">
        <KpiCard
          label="Caixa"
          value={
            <>
              {money(club.cash)} <small>moedas</small>
              <em>Só muda por compras e vendas</em>
            </>
          }
        />
        <KpiCard
          label="Valor do elenco"
          value={
            <>
              {money(club.squad_value)} <small>moedas</small>
              <em>Soma dos valores de mercado</em>
            </>
          }
        />
        <KpiCard
          label="Patrimônio"
          value={
            <>
              {money(club.net_worth)} <small>moedas</small>
              <em>Caixa + valor do elenco</em>
            </>
          }
        />
        <KpiCard
          label="Elenco"
          value={
            <>
              {club.players.length} <small>de 12</small>
              <em>Limite de 12 jogadores</em>
            </>
          }
        />
      </div>
      <div className="tabs-line">
        <button
          className={tab === "roster" ? "active" : ""}
          onClick={() => setTab("roster")}
        >
          <Icon name="shirt" size={14} /> Elenco{" "}
          <span className="club-tab-count">{club.players.length}</span>
        </button>
        <button
          className={tab === "lineup" ? "active" : ""}
          onClick={() => setTab("lineup")}
        >
          <Icon name="list-ordered" size={14} /> Escalação{" "}
          <span className="club-tab-count club-tab-status">
            {lineup?.complete ? "Completa" : "Incompleta"}
          </span>
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <Icon name="history" size={14} /> Histórico{" "}
          <span className="club-tab-count">
            {history?.meta.total_items ?? history?.data.length ?? "—"}
          </span>
        </button>
      </div>
      {tab === "roster" && (
        <Card className="table-card" id="players-table">
          <div className="table-toolbar">
            <div>
              <b>Elenco</b>
              <p className="muted">
                Ordenado por posição. Valores contratuais e de mercado
                calculados pela API.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Posição</th>
                  <th>Overall</th>
                  <th>Condição</th>
                  <th>Valor de mercado</th>
                  <th>Valor de compra</th>
                  <th>Fim da fidelidade</th>
                  <th>Dias restantes</th>
                  <th>% multa</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {club.players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="player-cell">
                        <span className="avatar">{initials(p.name)}</span>
                        <span>
                          <b>{p.name}</b>
                          <small>{p.position}</small>
                        </span>
                      </span>
                    </td>
                    <td>{p.position}</td>
                    <td>{p.overall}</td>
                    <td>
                      <ConditionBadge condition={p.condition} />
                    </td>
                    <td>{money(p.market_value)}</td>
                    <td>{money(p.contract?.purchase_value)}</td>
                    <td>
                      {p.contract?.loyalty_until
                        ? dateTime(p.contract.loyalty_until)
                        : "—"}
                    </td>
                    <td>{p.contract?.remaining_days ?? "—"}</td>
                    <td>{p.contract?.penalty_rate ?? 0}%</td>
                    <td>
                      <Button variant="outline" onClick={() => onSell(p)}>
                        <Icon name="hand-coins" size={13} /> Vender
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {club.players.length === 0 && (
              <Empty
                title="Nenhum jogador no elenco"
                detail="Compre jogadores livres para formar seu clube."
              />
            )}
          </div>
        </Card>
      )}
      {tab === "lineup" && (
        <div className="lineup-grid">
          <form className="lineup-editor-form" onSubmit={onSaveLineup}>
            <Card className="panel lineup-editor">
              <div className="lineup-editor-head">
                <div>
                  <b>Titulares</b>
                  <small>
                    1 goleiro e 4 jogadores de linha, na formação escolhida.
                    Salvar troca os 5 de uma vez.
                  </small>
                </div>
                <Badge
                  tone={
                    lineupForm.player_ids.filter(Boolean).length === 5
                      ? "success"
                      : "warning"
                  }
                >
                  {lineupForm.player_ids.filter(Boolean).length === 5
                    ? "Completa"
                    : "Incompleta"}
                </Badge>
              </div>
              {!lineup?.complete && (
                <div className="inline-alert alert-warning">
                  <Icon name="triangle-alert" size={15} />
                  <span>
                    <b>
                      Escalação incompleta: {club.name} não pode jogar partidas
                    </b>
                    <small>
                      O elenco tem {club.players.length} jogadores e a escalação
                      precisa de 5 titulares aptos. Compre jogadores e selecione
                      os titulares.
                    </small>
                  </span>
                </div>
              )}
              {actionError && (
                <div
                  className="inline-alert alert-error lineup-error"
                  role="alert"
                >
                  <Icon name="circle-alert" size={15} />
                  <span>
                    <b>A escalação foi recusada</b>
                    <small>{actionError}</small>
                  </span>
                </div>
              )}
              <div className="formation-section">
                <b>Formação</b>
                <small>
                  Os números contam os jogadores de linha de trás para frente. O
                  goleiro fica fora da conta.
                </small>
                <div className="formation-cards">
                  {formations.map((formation) => (
                    <button
                      key={formation}
                      type="button"
                      className={
                        lineupForm.formation === formation
                          ? "formation-card selected"
                          : "formation-card"
                      }
                      onClick={() => {
                        onClearActionError();
                        setLineupForm({
                          ...lineupForm,
                          formation,
                          player_ids: [],
                        });
                      }}
                    >
                      <Icon name="layout-grid" size={18} />
                      <span>
                        <b>{formation}</b>
                        <small>{formationText(formation)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <LineupPicker
                club={club}
                form={lineupForm}
                setForm={setLineupForm}
                onChange={onClearActionError}
              />
              {lineupForm.player_ids.filter(Boolean).length === 5 &&
                club.players.some(
                  (player) =>
                    lineupForm.player_ids.includes(player.id) &&
                    player.condition === "MAL_CONDICIONADO",
                ) && (
                  <div className="inline-alert alert-warning">
                    <Icon name="triangle-alert" size={15} />
                    <span>
                      <b>Jogadores mal condicionados</b>
                      <small>
                        Podem jogar, mas cada atributo vale 15% a menos durante
                        a partida.
                      </small>
                    </span>
                  </div>
                )}
              <div className="lineup-save-row">
                <small>
                  A escalação só é alterada ao salvar. Titular vendido ou que
                  fica doente sai dela.
                </small>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setLineupForm({
                      formation: lineup?.formation ?? "2-1-1",
                      player_ids:
                        lineup?.players.map((player) => player.id) ?? [],
                    })
                  }
                >
                  Cancelar
                </Button>
                <Button
                  disabled={
                    busy || lineupForm.player_ids.filter(Boolean).length !== 5
                  }
                >
                  <Icon name="circle-check" size={14} /> Salvar escalação
                </Button>
              </div>
            </Card>
          </form>
          <div className="lineup-side">
            <Card className="lineup-side-card">
              <div className="section-head">
                <div>
                  <b>Em campo</b>
                  <small>Prévia da formação {lineupForm.formation}.</small>
                </div>
              </div>
              <Pitch
                players={lineupForm.player_ids.map(
                  (id) =>
                    club.players.find((player) => player.id === id) ?? null,
                )}
              />
            </Card>
            <Card className="lineup-side-card">
              <div className="section-head">
                <div>
                  <b>Reservas</b>
                  <small>Jogadores do elenco fora da escalação.</small>
                </div>
              </div>
              <div className="reserve-list">
                {club.players
                  .filter(
                    (player) => !lineupForm.player_ids.includes(player.id),
                  )
                  .map((player) => (
                    <div className="reserve-player" key={player.id}>
                      <div className="reserve-player-main">
                        <span className="avatar">{initials(player.name)}</span>
                        <span>
                          <b>{player.name}</b>
                          <small>{positionName[player.position]}</small>
                        </span>
                        <ConditionBadge condition={player.condition} />
                      </div>
                      {player.condition === "DOENTE" && (
                        <small className="reserve-sick-note">
                          <Icon name="lock" size={11} /> Doente não pode ser
                          escalado.
                        </small>
                      )}
                    </div>
                  ))}
                {club.players.every((player) =>
                  lineupForm.player_ids.includes(player.id),
                ) && <p className="muted">Nenhum jogador reserva.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}
      {tab === "history" &&
        (historyLoading ? (
          <Card className="table-card">
            <LoadingState label="Carregando histórico de transações" rows={6} />
          </Card>
        ) : historyError ? (
          <Card className="table-card">
            <LoadError
              title="Não foi possível carregar o histórico"
              error={historyError}
              onRetry={onRetryHistory}
            />
          </Card>
        ) : (
          <>
            <Card className="table-card club-history-card">
              <div className="section-head">
                <div>
                  <h2>Histórico de transações</h2>
                  <p className="muted">Da mais recente para a mais antiga.</p>
                </div>
                <Button variant="outline" onClick={onExport}>
                  <Icon name="download" size={13} /> Exportar CSV
                </Button>
              </div>
              <div className="filters history-filters">
                <span className="history-type-label">Tipo:</span>
                {(["COMPRA", "VENDA"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`history-type-chip ${activeHistoryTypes.includes(type) ? "selected" : ""}`}
                    aria-pressed={activeHistoryTypes.includes(type)}
                    onClick={() => {
                      const selected = activeHistoryTypes;
                      const next = selected.includes(type)
                        ? selected.filter((item) => item !== type)
                        : [...selected, type];
                      setHistoryType(
                        next.length ? next.sort().join(",") : "__NONE__",
                      );
                    }}
                  >
                    <span className="history-checkbox" aria-hidden="true">
                      {activeHistoryTypes.includes(type) && <i />}
                    </span>
                    {type === "COMPRA" ? "Compra" : "Venda"}
                  </button>
                ))}
                <div className="history-player-select" ref={historyPlayerRef}>
                  <Button
                    variant="outline"
                    aria-expanded={historyPlayerOpen}
                    onClick={() => setHistoryPlayerOpen((open) => !open)}
                  >
                    <Icon name="user-round" size={13} />
                    Jogador:{" "}
                    {historyPlayer
                      ? (history?.data.find(
                          (item) => String(item.player_id) === historyPlayer,
                        )?.player_name ?? "selecionado")
                      : "todos"}
                    <Icon name="chevrons-up-down" size={12} />
                  </Button>
                  {historyPlayerOpen && (
                    <div
                      className="player-sort-menu history-player-menu"
                      role="menu"
                    >
                      <small>Filtrar por jogador</small>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={!historyPlayer}
                        className={!historyPlayer ? "selected" : ""}
                        onClick={() => {
                          setHistoryPlayer("");
                          setHistoryPlayerOpen(false);
                        }}
                      >
                        Todos os jogadores
                      </button>
                      {Array.from(
                        new Map(
                          (history?.data ?? []).map((t) => [t.player_id, t]),
                        ).values(),
                      ).map((t) => (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={historyPlayer === String(t.player_id)}
                          className={
                            historyPlayer === String(t.player_id)
                              ? "selected"
                              : ""
                          }
                          key={t.player_id}
                          onClick={() => {
                            setHistoryPlayer(String(t.player_id));
                            setHistoryPlayerOpen(false);
                          }}
                        >
                          {t.player_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(historyType !== "COMPRA,VENDA" || historyPlayer) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setHistoryType("COMPRA,VENDA");
                      setHistoryPlayer("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Data e hora</th>
                      <th>Tipo</th>
                      <th>Jogador</th>
                      <th>Valor</th>
                      <th>Taxa ou comissão</th>
                      <th>Multa</th>
                      <th>Lucro</th>
                      <th>Variação do caixa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history?.data.map((t) => (
                      <tr key={t.id}>
                        <td>{dateTime(t.created_at)}</td>
                        <td>
                          <Badge
                            tone={t.type === "COMPRA" ? "blue" : "success"}
                          >
                            <Icon
                              name={
                                t.type === "COMPRA"
                                  ? "shopping-cart"
                                  : "hand-coins"
                              }
                              size={11}
                            />
                            {t.type === "COMPRA" ? "Compra" : "Venda"}
                          </Badge>
                        </td>
                        <td>
                          <span className="player-cell">
                            <span className="avatar">
                              {initials(t.player_name)}
                            </span>
                            <b>{t.player_name}</b>
                          </span>
                        </td>
                        <td>{money(t.value)}</td>
                        <td>{money(t.fee)}</td>
                        <td>{money(t.penalty)}</td>
                        <td>{t.profit == null ? "—" : money(t.profit)}</td>
                        <td
                          className={
                            t.cash_change >= 0 ? "positive" : "negative"
                          }
                        >
                          {t.cash_change >= 0 ? "+" : "−"}
                          {money(Math.abs(t.cash_change))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!history?.data.length && (
                  <Empty
                    title="Nenhuma transação ainda"
                    detail="Compras e vendas aparecerão aqui."
                  />
                )}
              </div>
              <div className="summary-strip">
                {[
                  ["Total pago em compras", history?.summary.total_spent],
                  ["Total recebido em vendas", history?.summary.total_received],
                  ["Taxas e comissões", history?.summary.total_fees],
                  ["Multas", history?.summary.total_penalties],
                  ["Lucro total", history?.summary.total_profit],
                ].map(([l, v]) => (
                  <KpiCard
                    key={String(l)}
                    label={String(l)}
                    value={money(Number(v ?? 0))}
                  />
                ))}
              </div>
            </Card>
            <p className="footnote">
              Os totais respeitam os filtros. O CSV usa os mesmos filtros
              aplicados na tela.
            </p>
          </>
        ))}
    </>
  );
}
export function LineupPicker({
  club,
  form,
  setForm,
  onChange,
}: {
  club: (Club & { players: Player[] }) | null;
  form: { formation: string; player_ids: number[] };
  setForm: (v: { formation: string; player_ids: number[] }) => void;
  onChange?: () => void;
}) {
  const players = club?.players.filter((p) => p.condition !== "DOENTE") ?? [];
  const lines: Record<string, Position[]> = {
    "3-1": ["ZAG", "LAT", "LAT", "ATA"],
    "2-2": ["ZAG", "LAT", "ATA", "ATA"],
    "2-1-1": ["ZAG", "LAT", "MEI", "ATA"],
    "1-2-1": ["ZAG", "MEI", "MEI", "ATA"],
  };
  const slots: Position[] = [
    "GOL",
    ...(lines[form.formation] ?? lines["2-1-1"]),
  ];
  const label = (slot: Position) =>
    slot === "GOL"
      ? "Goleiro"
      : slot === "ZAG" || slot === "LAT"
        ? "Defesa"
        : slot === "MEI"
          ? "Meio"
          : "Ataque";
  const stat = (p: Player): string => {
    const key: Record<Position, string> = {
      GOL: `Defesa ${p.defending}`,
      ZAG: `Defesa ${p.defending}`,
      LAT: `Velocidade ${p.pace}`,
      MEI: `Passe ${p.passing}`,
      ATA: `Finalização ${p.shooting}`,
    };
    return key[p.position];
  };
  return (
    <div className="lineup-picker">
      <div className="lineup-slot-head">
        <span>Vaga</span>
        <span>Titular</span>
        <span>Condição</span>
        <span>Overall</span>
        <span>Atributos usados</span>
      </div>
      <div className="lineup-slots">
        {slots.map((slot, index) => {
          const selected = players.find((p) => p.id === form.player_ids[index]);
          const eligible = players.filter(
            (p) =>
              p.position === slot &&
              (!form.player_ids.includes(p.id) ||
                form.player_ids[index] === p.id),
          );
          return (
            <div className="lineup-slot" key={`${slot}-${index}`}>
              <span>
                <b>{label(slot)}</b>
                <small>{slot}</small>
              </span>
              <Select
                value={form.player_ids[index] || ""}
                disabled={!eligible.length}
                onChange={(e) => {
                  onChange?.();
                  const next = [...form.player_ids];
                  next[index] = Number(e.target.value);
                  setForm({ ...form, player_ids: next });
                }}
              >
                <option value="">
                  {eligible.length
                    ? "Escolha o titular"
                    : `Sem ${slot} no elenco`}
                </option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position})
                  </option>
                ))}
              </Select>
              {selected ? (
                <ConditionBadge condition={selected.condition} />
              ) : (
                <span className="muted">—</span>
              )}
              <b>{selected?.overall ?? "—"}</b>
              <span className="used-attribute">
                {selected ? stat(selected) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function formationText(formation: string) {
  const descriptions: Record<string, string> = {
    "3-1": "Defesa 3, ataque 1",
    "2-2": "Defesa 2, ataque 2",
    "2-1-1": "Defesa 2, meio 1, ataque 1",
    "1-2-1": "Defesa 1, meio 2, ataque 1",
  };
  return descriptions[formation] ?? "Formação";
}
function Pitch({ players }: { players: (Player | null)[] }) {
  return (
    <div className="pitch">
      <div className="pitch-lines">
        <span className="center-circle" />
        <span className="half-line" />
        <div className="pitch-players">
          {Array.from({ length: 5 }, (_, index) => {
            const player = players[index];
            return player ? (
              <div key={player.id} className={`pitch-player place-${index}`}>
                <span>{initials(player.name)}</span>
                <small>{player.name.split(" ")[0]}</small>
              </div>
            ) : (
              <div
                key={`vacant-${index}`}
                className={`pitch-vacancy place-${index}`}
              >
                <span>＋</span>
                <small>
                  {["Goleiro", "Defesa", "Defesa", "Meio", "Ataque"][index]}
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
