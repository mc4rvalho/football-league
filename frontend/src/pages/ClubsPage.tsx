import { useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  Club,
  Lineup,
  Player,
  Position,
  TransactionHistory,
} from "../lib/types";
import { Badge, Button, Card, Empty, Field, Select } from "../components/ui";
import { ConditionBadge } from "../components/ConditionBadge";
import { KpiCard } from "../components/KpiCard";
import { PageHeading } from "../components/PageHeading";
import { PlayerSummary } from "../components/PlayerSummary";
import { dateTime, initials, money } from "../components/formatters";

export function ClubsView({
  clubs,
  club,
  clubId,
  tab,
  setTab,
  onNew,
  onSelect,
  onMarket,
  onSell,
  onEditLineup,
  history,
  historyType,
  setHistoryType,
  historyPlayer,
  setHistoryPlayer,
  onExport,
  onRetry,
}: {
  clubs: Club[];
  club: (Club & { players: Player[] }) | null;
  clubId: number | null;
  tab: "roster" | "lineup" | "history";
  setTab: (v: "roster" | "lineup" | "history") => void;
  onNew: () => void;
  onSelect: (id: number) => void;
  onMarket: () => void;
  onSell: (p: Player) => void;
  onEditLineup: () => void;
  history: TransactionHistory | null;
  historyType: string;
  setHistoryType: (v: string) => void;
  historyPlayer: string;
  setHistoryPlayer: (v: string) => void;
  onExport: () => void;
  onRetry: () => void;
}) {
  const [sort, setSort] = useState("name");
  const [lineup, setLineup] = useState<Lineup | null>(null);
  useEffect(() => {
    if (clubId)
      void api<Lineup>(`/clubs/${clubId}/lineup`)
        .then(setLineup)
        .catch(() => setLineup(null));
  }, [clubId, club]);
  if (!clubId)
    return (
      <>
        <PageHeading
          title="Clubes"
          subtitle="Crie clubes, acompanhe o caixa e gerencie os elencos."
          action={<Button onClick={onNew}>＋ Novo clube</Button>}
        />
        <Card className="table-card">
          <div className="table-toolbar">
            <span>{clubs.length} clubes</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Ordenar: nome</option>
              <option value="net_worth_desc">
                Patrimônio (maior para o menor)
              </option>
              <option value="net_worth_asc">
                Patrimônio (menor para o maior)
              </option>
            </Select>
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
                        <b>{c.name}</b>
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
                          variant="outline"
                          onClick={() => onSelect(c.id)}
                        >
                          Ver clube →
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {clubs.length === 0 && (
              <Empty
                title="Nenhum clube cadastrado"
                detail="Crie o primeiro clube para começar a liga."
                action={<Button onClick={onNew}>＋ Novo clube</Button>}
              />
            )}
          </div>
        </Card>
      </>
    );
  if (!club)
    return (
      <Empty
        title="Clube não encontrado"
        detail="Tente atualizar ou escolha outro clube no menu."
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
            <Badge>{club.players.length} jogadores</Badge>
          </div>
        </div>
        <Button onClick={onMarket}>＋ Comprar jogadores</Button>
      </div>
      <div className="kpi-grid club-kpis">
        <KpiCard label="Caixa" value={`${money(club.cash)} moedas`} />
        <KpiCard
          label="Valor do elenco"
          value={`${money(club.squad_value)} moedas`}
        />
        <KpiCard label="Patrimônio" value={`${money(club.net_worth)} moedas`} />
        <KpiCard label="Elenco" value={`${club.players.length} jogadores`} />
      </div>
      <div className="tabs-line">
        <button
          className={tab === "roster" ? "active" : ""}
          onClick={() => setTab("roster")}
        >
          ♙ Elenco <Badge>{club.players.length}</Badge>
        </button>
        <button
          className={tab === "lineup" ? "active" : ""}
          onClick={() => setTab("lineup")}
        >
          ⚑ Escalação <Badge>{lineup?.complete ? "Completa" : "—"}</Badge>
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          ◷ Histórico <Badge>{history?.data.length ?? "—"}</Badge>
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
                      <b>{p.name}</b>
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
                        Vender
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
          <Card className="panel">
            <div className="section-head">
              <div>
                <h2>Titulares</h2>
                <p className="muted">
                  Formação {lineup?.formation ?? "não definida"} · 5 vagas
                </p>
              </div>
              <Button variant="outline" onClick={onEditLineup}>
                Editar escalação
              </Button>
            </div>
            {lineup?.players.length ? (
              <div className="roster-list">
                {lineup.players.map((p) => (
                  <PlayerSummary key={p.id} player={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="Escalação incompleta"
                detail="Escolha uma formação e escale 5 titulares aptos para jogar."
                action={
                  <Button onClick={onEditLineup}>Montar escalação</Button>
                }
              />
            )}
          </Card>
          <Pitch lineup={lineup} />
        </div>
      )}
      {tab === "history" && (
        <Card className="table-card">
          <div className="section-head">
            <div>
              <h2>Histórico de transações</h2>
              <p className="muted">Da mais recente para a mais antiga.</p>
            </div>
            <Button variant="outline" onClick={onExport}>
              ⇩ Exportar CSV
            </Button>
          </div>
          <div className="filters">
            {(["COMPRA", "VENDA"] as const).map((type) => (
              <Button
                key={type}
                variant={
                  historyType.split(",").includes(type) ? "default" : "outline"
                }
                onClick={() => {
                  const selected = historyType.split(",").filter(Boolean);
                  const next = selected.includes(type)
                    ? selected.filter((item) => item !== type)
                    : [...selected, type];
                  setHistoryType(next.sort().join(","));
                }}
              >
                {type === "COMPRA" ? "Compra" : "Venda"}
              </Button>
            ))}
            <Select
              value={historyPlayer}
              onChange={(e) => setHistoryPlayer(e.target.value)}
            >
              <option value="">Todos os jogadores</option>
              {Array.from(
                new Map(
                  (history?.data ?? []).map((t) => [t.player_id, t]),
                ).values(),
              ).map((t) => (
                <option key={t.player_id} value={t.player_id}>
                  {t.player_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Tipo</th>
                  <th>Jogador</th>
                  <th>Valor</th>
                  <th>Taxa/comissão</th>
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
                      <Badge tone={t.type === "COMPRA" ? "blue" : "success"}>
                        {t.type}
                      </Badge>
                    </td>
                    <td>{t.player_name}</td>
                    <td>{money(t.value)}</td>
                    <td>{money(t.fee)}</td>
                    <td>{money(t.penalty)}</td>
                    <td>{t.profit == null ? "—" : money(t.profit)}</td>
                    <td
                      className={t.cash_change >= 0 ? "positive" : "negative"}
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
      )}
    </>
  );
}
export function LineupPicker({
  club,
  form,
  setForm,
}: {
  club: (Club & { players: Player[] }) | null;
  form: { formation: string; player_ids: number[] };
  setForm: (v: { formation: string; player_ids: number[] }) => void;
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
  const label = (slot: Position, index: number) =>
    slot === "GOL"
      ? "Goleiro"
      : `${slot === "ZAG" || slot === "LAT" ? "Defesa" : slot === "MEI" ? "Meio" : "Ataque"} ${index}`;
  return (
    <div className="lineup-picker">
      <p className="muted">
        Selecione um jogador para cada vaga (
        {form.player_ids.filter(Boolean).length} de 5)
      </p>
      <div className="player-options">
        {slots.map((slot, index) => (
          <Field key={`${slot}-${index}`} label={label(slot, index)}>
            <Select
              required
              value={form.player_ids[index] || ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                const next = [...form.player_ids];
                next[index] = id;
                setForm({ ...form, player_ids: next });
              }}
            >
              <option value="">Escolha o titular</option>
              {players
                .filter(
                  (p) =>
                    p.position === slot &&
                    (!form.player_ids.includes(p.id) ||
                      form.player_ids[index] === p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.position} · {p.overall}
                  </option>
                ))}
            </Select>
          </Field>
        ))}
      </div>
    </div>
  );
}
function Pitch({ lineup }: { lineup: Lineup | null }) {
  return (
    <div className="pitch">
      <div className="pitch-lines">
        <span className="center-circle" />
        <span className="half-line" />
        <div className="pitch-players">
          {(lineup?.players ?? []).map((p, i) => (
            <div key={p.id} className={`pitch-player place-${i}`}>
              <span>{initials(p.name)}</span>
              <small>{p.name.split(" ")[0]}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
