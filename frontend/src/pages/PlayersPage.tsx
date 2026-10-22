import { useState } from "react";
import type { Club, Page, Player, Position } from "../lib/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Select,
} from "../components/ui";
import { ConditionBadge } from "../components/ConditionBadge";
import { PageHeading } from "../components/PageHeading";
import { initials, money, positionName } from "../components/formatters";

const positions: Position[] = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
export type Filters = {
  search: string;
  setSearch: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  clubFilter: string;
  setClubFilter: (v: string) => void;
  free: boolean;
  setFree: (v: boolean) => void;
  sort: string;
  setSort: (v: string) => void;
  minAge: string;
  setMinAge: (v: string) => void;
  maxAge: string;
  setMaxAge: (v: string) => void;
  minValue: string;
  setMinValue: (v: string) => void;
  maxValue: string;
  setMaxValue: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
};
export function PlayersView({
  players,
  clubs,
  loading,
  filters: f,
  onNew,
  onEdit,
  onBuy,
  onDetails,
  onCondition,
  onDelete,
  onRetry,
}: {
  players: Page<Player> | null;
  clubs: Club[];
  loading: boolean;
  filters: Filters;
  onNew: () => void;
  onEdit: (p: Player) => void;
  onBuy: (p: Player) => void;
  onDetails: (p: Player) => void;
  onCondition: (p: Player) => void;
  onDelete: (p: Player) => void;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = players?.meta.total_items ?? 0;
  return (
    <>
      <PageHeading
        title="Jogadores"
        subtitle="Cadastre jogadores, acompanhe os indicadores e compre os que estão livres."
        action={<Button onClick={onNew}>＋ Novo jogador</Button>}
      />
      <div className="filters">
        <Input
          aria-label="Buscar jogador"
          placeholder="⌕  Buscar por nome"
          value={f.search}
          onChange={(e) => {
            f.setSearch(e.target.value);
            f.setPage(1);
          }}
        />
        <Select
          aria-label="Posição"
          value={f.position}
          onChange={(e) => {
            f.setPosition(e.target.value);
            f.setPage(1);
          }}
        >
          <option value="">Posição</option>
          {positions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        <Select
          aria-label="Condição"
          value={f.condition}
          onChange={(e) => {
            f.setCondition(e.target.value);
            f.setPage(1);
          }}
        >
          <option value="">Condição</option>
          {["APTO", "MAL_CONDICIONADO", "DOENTE"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Select
          aria-label="Clube"
          value={f.clubFilter}
          disabled={f.free}
          onChange={(e) => {
            f.setClubFilter(e.target.value);
            f.setPage(1);
          }}
        >
          <option value="">Clube</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button
          variant={f.free ? "default" : "outline"}
          onClick={() => {
            f.setFree(!f.free);
            if (!f.free) f.setClubFilter("");
            f.setPage(1);
          }}
        >
          Só livres
        </Button>
        <Button variant="outline" onClick={() => setExpanded(!expanded)}>
          Mais filtros⌄
        </Button>
      </div>
      {expanded && (
        <div className="filters filter-secondary">
          <Field label="Idade mínima">
            <Input
              type="number"
              min={16}
              max={45}
              value={f.minAge}
              onChange={(e) => {
                f.setMinAge(e.target.value);
                f.setPage(1);
              }}
              placeholder="16"
            />
          </Field>
          <Field label="Idade máxima">
            <Input
              type="number"
              min={16}
              max={45}
              value={f.maxAge}
              onChange={(e) => {
                f.setMaxAge(e.target.value);
                f.setPage(1);
              }}
              placeholder="45"
            />
          </Field>
          <Field label="Valor mínimo">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.minValue}
              onChange={(e) => {
                f.setMinValue(e.target.value);
                f.setPage(1);
              }}
              placeholder="0,00"
            />
          </Field>
          <Field label="Valor máximo">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.maxValue}
              onChange={(e) => {
                f.setMaxValue(e.target.value);
                f.setPage(1);
              }}
              placeholder="999,99"
            />
          </Field>
        </div>
      )}
      <Card className="table-card">
        <div className="table-toolbar">
          <div className="tabs-pills">
            <Badge tone="blue">Todos · {total}</Badge>
            <Badge tone="neutral">
              Livres ·{" "}
              {players?.data.filter((p) => p.club_id === null).length ?? "—"}
            </Badge>
            <Badge tone="neutral">
              Em clubes ·{" "}
              {players?.data.filter((p) => p.club_id !== null).length ?? "—"}
            </Badge>
          </div>
          <Select
            aria-label="Ordenar"
            value={f.sort}
            onChange={(e) => {
              f.setSort(e.target.value);
              f.setPage(1);
            }}
          >
            <option value="name">Ordenar: nome</option>
            <option value="value_desc">Maior valor de mercado</option>
            <option value="value_asc">Menor valor de mercado</option>
            <option value="age_desc">Maior idade</option>
            <option value="age_asc">Menor idade</option>
            <option value="position">Posição</option>
          </Select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Posição</th>
                <th>Overall</th>
                <th>Agilidade</th>
                <th>Idade</th>
                <th>Condição</th>
                <th>Valor base</th>
                <th>Valor de mercado</th>
                <th>Clube</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    <div className="loading-line">Carregando jogadores…</div>
                  </td>
                </tr>
              ) : (
                players?.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="player-cell"
                        onClick={() => onDetails(p)}
                      >
                        <span className="avatar">{initials(p.name)}</span>
                        <span>
                          <b>{p.name}</b>
                          <small>{positionName[p.position]}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Badge>{p.position}</Badge>
                    </td>
                    <td>
                      <b>{p.overall}</b>
                    </td>
                    <td>{p.agility}</td>
                    <td>{p.age}</td>
                    <td>
                      <ConditionBadge condition={p.condition} />
                    </td>
                    <td>{money(p.base_value)}</td>
                    <td>
                      <b>{money(p.market_value)}</b>
                    </td>
                    <td>
                      {p.club_id
                        ? (clubs.find((c) => c.id === p.club_id)?.acronym ??
                          p.club_id)
                        : "Livre"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          onClick={() => onEdit(p)}
                          title="Editar"
                        >
                          ✎
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => onCondition(p)}
                          title="Condição"
                        >
                          ♡
                        </Button>
                        {p.club_id === null && (
                          <>
                            <Button variant="outline" onClick={() => onBuy(p)}>
                              Comprar
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => onDelete(p)}
                              title="Excluir"
                            >
                              ⋯
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && players?.data.length === 0 && (
            <Empty
              title="Nenhum jogador encontrado"
              detail="Confira os filtros ou cadastre um novo jogador."
              action={<Button onClick={onNew}>＋ Novo jogador</Button>}
            />
          )}
        </div>
        <div className="table-footer">
          <span>
            {loading
              ? "Carregando…"
              : `Mostrando ${players?.data.length ?? 0} de ${total} jogadores`}
          </span>
          <div className="pagination">
            <Button
              variant="outline"
              disabled={f.page <= 1 || loading}
              onClick={() => f.setPage(f.page - 1)}
            >
              Anterior
            </Button>
            <b>{f.page}</b>
            <Button
              variant="outline"
              disabled={f.page >= (players?.meta.total_pages ?? 1) || loading}
              onClick={() => f.setPage(f.page + 1)}
            >
              Próxima
            </Button>
            <Button variant="ghost" onClick={onRetry}>
              ↻
            </Button>
          </div>
        </div>
      </Card>
      <p className="footnote">
        Valor base, valor de mercado e overall são calculados pela API; filtros
        podem ser combinados.
      </p>
    </>
  );
}
