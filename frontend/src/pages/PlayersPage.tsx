import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Club, Page, Player, Position } from "../lib/types";
import { Badge, Button, Card, Field, Input, LoadError } from "../components/ui";
import { ConditionBadge } from "../components/ConditionBadge";
import { PageHeading } from "../components/PageHeading";
import { Icon } from "../components/Icon";
import { initials, money, positionName } from "../components/formatters";

const positions: Position[] = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
type FilterPanel = "position" | "condition" | "club" | "age" | "value" | null;
const sortOptions = [
  { value: "name", label: "Nome" },
  { value: "value_desc", label: "Maior valor de mercado" },
  { value: "value_asc", label: "Menor valor de mercado" },
  { value: "age_desc", label: "Maior idade" },
  { value: "age_asc", label: "Menor idade" },
  { value: "position", label: "Posição (GOL a ATA)" },
];

export type Filters = {
  search: string;
  setSearch: (value: string) => void;
  position: string;
  setPosition: (value: string) => void;
  condition: string;
  setCondition: (value: string) => void;
  clubFilter: string;
  setClubFilter: (value: string) => void;
  free: boolean;
  setFree: (value: boolean) => void;
  clubOnly: boolean;
  setClubOnly: (value: boolean) => void;
  sort: string;
  setSort: (value: string) => void;
  minAge: string;
  setMinAge: (value: string) => void;
  maxAge: string;
  setMaxAge: (value: string) => void;
  minValue: string;
  setMinValue: (value: string) => void;
  maxValue: string;
  setMaxValue: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
};

function AgilityValue({ value }: { value: number }) {
  const tone = value >= 75 ? "high" : value < 40 ? "low" : "medium";
  return (
    <span className="agility-value">
      <span>{value}</span>
      <span className={`agility-meter agility-${tone}`}>
        <i style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

export function PlayersView({
  players,
  clubs,
  counts,
  loading,
  loadError,
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
  counts: { total: number; free: number; inClubs: number };
  loading: boolean;
  loadError: string | null;
  filters: Filters;
  onNew: () => void;
  onEdit: (player: Player) => void;
  onBuy: (player: Player) => void;
  onDetails: (player: Player) => void;
  onCondition: (player: Player) => void;
  onDelete: (player: Player) => void;
  onRetry: () => void;
}) {
  const [filterPanel, setFilterPanel] = useState<FilterPanel>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [menuPlayerId, setMenuPlayerId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 8, left: 8 });
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node))
        setSortMenuOpen(false);
      if (!filtersRef.current?.contains(event.target as Node))
        setFilterPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterPanel(null);
        setSortMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const total = players?.meta.total_items ?? 0;
  const searchTerm = f.search.trim();
  const hasFilters = Boolean(
    searchTerm ||
    f.position ||
    f.condition ||
    f.clubFilter ||
    f.minAge ||
    f.maxAge ||
    f.minValue ||
    f.maxValue,
  );
  const ageLabel =
    f.minAge || f.maxAge
      ? `${f.minAge || "16"} a ${f.maxAge || "45"}`
      : "Idade";
  const valueLabel =
    f.minValue || f.maxValue
      ? `${f.minValue || "0"},00 a ${f.maxValue || "—"}`
      : "Valor de mercado";
  const clearFilters = () => {
    f.setSearch("");
    f.setPosition("");
    f.setCondition("");
    f.setClubFilter("");
    f.setFree(false);
    f.setClubOnly(false);
    f.setMinAge("");
    f.setMaxAge("");
    f.setMinValue("");
    f.setMaxValue("");
    f.setPage(1);
  };

  return (
    <>
      <PageHeading
        title="Jogadores"
        subtitle="Cadastre jogadores, acompanhe os indicadores e compre os que estão livres."
        action={
          <Button onClick={onNew}>
            <Icon name="plus" size={14} /> Novo jogador
          </Button>
        }
      />

      <div className="player-filters" ref={filtersRef}>
        <label className="player-search">
          <Icon name="search" size={15} />
          <input
            aria-label="Buscar jogador"
            placeholder="Buscar por nome"
            value={f.search}
            onChange={(event) => {
              f.setSearch(event.target.value);
              f.setPage(1);
            }}
          />
        </label>
        <div className="player-filter-wrap">
          <Button
            variant="outline"
            aria-label="Filtrar por posição"
            aria-expanded={filterPanel === "position"}
            onClick={() =>
              setFilterPanel(filterPanel === "position" ? null : "position")
            }
          >
            <Icon name="shirt" size={14} />
            <span className="player-filter-label">
              {f.position || "Posição"}
            </span>
            <Icon name="chevron-down" size={12} />
          </Button>
          {filterPanel === "position" && (
            <div className="player-sort-menu player-filter-menu" role="menu">
              <small>Filtrar por posição</small>
              {[
                { value: "", label: "Todas as posições" },
                ...positions.map((position) => ({
                  value: position,
                  label: `${position} · ${positionName[position]}`,
                })),
              ].map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={f.position === option.value}
                  className={f.position === option.value ? "selected" : ""}
                  key={option.value || "all"}
                  onClick={() => {
                    f.setPosition(option.value);
                    f.setPage(1);
                    setFilterPanel(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="player-filter-wrap">
          <Button
            variant="outline"
            aria-label="Filtrar por condição"
            aria-expanded={filterPanel === "condition"}
            onClick={() =>
              setFilterPanel(filterPanel === "condition" ? null : "condition")
            }
          >
            <Icon name="heart-pulse" size={14} />
            <span className="player-filter-label">
              {f.condition ? conditionLabel(f.condition) : "Condição"}
            </span>
            <Icon name="chevron-down" size={12} />
          </Button>
          {filterPanel === "condition" && (
            <div className="player-sort-menu player-filter-menu" role="menu">
              <small>Filtrar por condição</small>
              {[
                { value: "", label: "Todas as condições" },
                { value: "APTO", label: "Apto" },
                { value: "MAL_CONDICIONADO", label: "Mal condicionado" },
                { value: "DOENTE", label: "Doente" },
              ].map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={f.condition === option.value}
                  className={f.condition === option.value ? "selected" : ""}
                  key={option.value || "all"}
                  onClick={() => {
                    f.setCondition(option.value);
                    f.setPage(1);
                    setFilterPanel(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="player-filter-wrap">
          <Button
            variant="outline"
            aria-label="Filtrar por clube"
            aria-expanded={filterPanel === "club"}
            disabled={f.free}
            onClick={() =>
              setFilterPanel(filterPanel === "club" ? null : "club")
            }
          >
            <Icon name="shield" size={14} />
            <span className="player-filter-label">
              {f.clubFilter
                ? (clubs.find((club) => String(club.id) === f.clubFilter)
                    ?.acronym ?? "Clube")
                : "Clube"}
            </span>
            <Icon name="chevron-down" size={12} />
          </Button>
          {filterPanel === "club" && !f.free && (
            <div className="player-sort-menu player-filter-menu" role="menu">
              <small>Filtrar por clube</small>
              {[
                { value: "", label: "Todos os clubes" },
                ...clubs.map((club) => ({
                  value: String(club.id),
                  label: `${club.acronym} · ${club.name}`,
                })),
              ].map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={f.clubFilter === option.value}
                  className={f.clubFilter === option.value ? "selected" : ""}
                  key={option.value || "all"}
                  onClick={() => {
                    f.setClubFilter(option.value);
                    f.setPage(1);
                    setFilterPanel(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="player-filter-wrap">
          <Button
            variant="outline"
            aria-expanded={filterPanel === "age"}
            onClick={() => setFilterPanel(filterPanel === "age" ? null : "age")}
          >
            <Icon name="user-round" size={14} /> {ageLabel}
            <Icon name="chevron-down" size={12} />
          </Button>
          {filterPanel === "age" && (
            <div className="player-filter-popover">
              <b>Faixa de idade</b>
              <div className="player-range-fields">
                <Field label="Mínima">
                  <Input
                    aria-label="Idade mínima"
                    type="number"
                    min={16}
                    max={45}
                    value={f.minAge}
                    placeholder="16"
                    onChange={(event) => {
                      f.setMinAge(event.target.value);
                      f.setPage(1);
                    }}
                  />
                </Field>
                <Field label="Máxima">
                  <Input
                    aria-label="Idade máxima"
                    type="number"
                    min={16}
                    max={45}
                    value={f.maxAge}
                    placeholder="45"
                    onChange={(event) => {
                      f.setMaxAge(event.target.value);
                      f.setPage(1);
                    }}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
        <div className="player-filter-wrap">
          <Button
            variant="outline"
            aria-expanded={filterPanel === "value"}
            onClick={() =>
              setFilterPanel(filterPanel === "value" ? null : "value")
            }
          >
            <Icon name="coins" size={14} /> {valueLabel}
            <Icon name="chevron-down" size={12} />
          </Button>
          {filterPanel === "value" && (
            <div className="player-filter-popover">
              <b>Faixa de valor de mercado</b>
              <div className="player-range-fields">
                <Field label="Mínimo">
                  <Input
                    aria-label="Valor mínimo"
                    type="number"
                    min={0}
                    step="0.01"
                    value={f.minValue}
                    placeholder="0,00"
                    onChange={(event) => {
                      f.setMinValue(event.target.value);
                      f.setPage(1);
                    }}
                  />
                </Field>
                <Field label="Máximo">
                  <Input
                    aria-label="Valor máximo"
                    type="number"
                    min={0}
                    step="0.01"
                    value={f.maxValue}
                    placeholder="999,99"
                    onChange={(event) => {
                      f.setMaxValue(event.target.value);
                      f.setPage(1);
                    }}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="active-filters">
          <span>
            {searchTerm ? "Resultados para a busca:" : "Filtros ativos:"}
          </span>
          {searchTerm && (
            <FilterChip
              label={`Busca: ${searchTerm}`}
              onClear={() => f.setSearch("")}
            />
          )}
          {f.position && (
            <FilterChip
              label={`Posição: ${f.position}`}
              onClear={() => f.setPosition("")}
            />
          )}
          {f.condition && (
            <FilterChip
              label={`Condição: ${conditionLabel(f.condition)}`}
              onClear={() => f.setCondition("")}
            />
          )}
          {f.clubFilter && (
            <FilterChip
              label={`Clube: ${clubs.find((club) => String(club.id) === f.clubFilter)?.acronym ?? f.clubFilter}`}
              onClear={() => f.setClubFilter("")}
            />
          )}
          {(f.minAge || f.maxAge) && (
            <FilterChip
              label={`Idade: ${ageLabel}`}
              onClear={() => {
                f.setMinAge("");
                f.setMaxAge("");
              }}
            />
          )}
          {(f.minValue || f.maxValue) && (
            <FilterChip
              label={`Valor: ${valueLabel}`}
              onClear={() => {
                f.setMinValue("");
                f.setMaxValue("");
              }}
            />
          )}
          <button className="clear-filters" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>
      )}

      <Card className="table-card players-table-card">
        {loading ? (
          <div className="player-loading" aria-label="Carregando jogadores">
            <span>Carregando jogadores…</span>
            {Array.from({ length: 8 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        ) : loadError ? (
          <LoadError
            title="Não foi possível carregar os jogadores"
            error={loadError}
            onRetry={onRetry}
          />
        ) : (
          <>
            <div className="table-toolbar players-toolbar">
              <div
                className="player-scope-tabs"
                role="tablist"
                aria-label="Filtrar jogadores por elenco"
              >
                <button
                  className={!f.free && !f.clubOnly ? "active" : ""}
                  onClick={() => {
                    f.setFree(false);
                    f.setClubOnly(false);
                    f.setPage(1);
                  }}
                >
                  Todos <b>{counts.total}</b>
                </button>
                <button
                  className={f.free ? "active" : ""}
                  disabled={Boolean(f.clubFilter)}
                  title={
                    f.clubFilter
                      ? "A lista de livres não combina com o filtro por clube."
                      : undefined
                  }
                  onClick={() => {
                    f.setFree(true);
                    f.setClubOnly(false);
                    f.setClubFilter("");
                    f.setPage(1);
                  }}
                >
                  Livres <b>{counts.free}</b>
                </button>
                <button
                  className={f.clubOnly ? "active" : ""}
                  onClick={() => {
                    f.setFree(false);
                    f.setClubOnly(true);
                    f.setPage(1);
                  }}
                >
                  Em clubes <b>{counts.inClubs}</b>
                </button>
              </div>
              <div className="player-sort" ref={sortMenuRef}>
                <button
                  className="player-sort-trigger"
                  aria-label="Ordenar jogadores"
                  aria-expanded={sortMenuOpen}
                  onClick={() => setSortMenuOpen((open) => !open)}
                >
                  <Icon name="list-ordered" size={14} />
                  Ordenar:{" "}
                  {sortOptions
                    .find((option) => option.value === f.sort)
                    ?.label.toLowerCase() ?? "nome"}
                  <Icon name="chevron-down" size={12} />
                </button>
                {sortMenuOpen && (
                  <div className="player-sort-menu" role="menu">
                    <small>Ordenar por</small>
                    {sortOptions.map((option) => (
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={f.sort === option.value}
                        className={f.sort === option.value ? "selected" : ""}
                        key={option.value}
                        onClick={() => {
                          f.setSort(option.value);
                          f.setPage(1);
                          setSortMenuOpen(false);
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
              <table className="players-table">
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
                  {players?.data.map((player) => {
                    const club = clubs.find(
                      (item) => item.id === player.club_id,
                    );
                    return (
                      <tr key={player.id}>
                        <td>
                          <button
                            className="player-cell"
                            onClick={() => onDetails(player)}
                          >
                            <span className="avatar">
                              {initials(player.name)}
                            </span>
                            <span>
                              <b>{player.name}</b>
                              <small>{positionName[player.position]}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <Badge>{player.position}</Badge>
                        </td>
                        <td>
                          <b>{player.overall}</b>
                        </td>
                        <td>
                          <AgilityValue value={player.agility} />
                        </td>
                        <td>{player.age}</td>
                        <td>
                          <ConditionBadge condition={player.condition} />
                        </td>
                        <td>{money(player.base_value)}</td>
                        <td>
                          <b>{money(player.market_value)}</b>
                        </td>
                        <td>
                          {player.club_id === null ? (
                            <Badge> Livre </Badge>
                          ) : (
                            <span className="club-cell">
                              <Badge>{club?.acronym ?? player.club_id}</Badge>
                              <u>{club?.name ?? player.club_name ?? "Clube"}</u>
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions player-row-actions">
                            {player.club_id === null && (
                              <Button
                                variant="outline"
                                onClick={() => onBuy(player)}
                              >
                                <Icon name="shopping-cart" size={13} /> Comprar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              aria-label={`Ações de ${player.name}`}
                              aria-expanded={menuPlayerId === player.id}
                              onClick={(event) => {
                                if (menuPlayerId === player.id) {
                                  setMenuPlayerId(null);
                                  return;
                                }
                                const rect =
                                  event.currentTarget.getBoundingClientRect();
                                const menuHeight =
                                  player.club_id === null ? 170 : 112;
                                setMenuPosition({
                                  top: Math.max(8, rect.top - menuHeight - 4),
                                  left: Math.min(
                                    window.innerWidth - 178,
                                    Math.max(8, rect.right - 170),
                                  ),
                                });
                                setMenuPlayerId(player.id);
                              }}
                            >
                              <Icon name="ellipsis" />
                            </Button>
                            {menuPlayerId === player.id &&
                              createPortal(
                                <div
                                  className="player-action-menu"
                                  style={menuPosition}
                                >
                                  <small>{player.name}</small>
                                  <button
                                    onClick={() => {
                                      onDetails(player);
                                      setMenuPlayerId(null);
                                    }}
                                  >
                                    <Icon name="user-round" size={14} /> Ver
                                    detalhes
                                  </button>
                                  <button
                                    onClick={() => {
                                      onEdit(player);
                                      setMenuPlayerId(null);
                                    }}
                                  >
                                    <Icon name="pencil" size={14} /> Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      onCondition(player);
                                      setMenuPlayerId(null);
                                    }}
                                  >
                                    <Icon name="heart-pulse" size={14} />{" "}
                                    Alterar condição
                                  </button>
                                  {player.club_id === null && (
                                    <button
                                      onClick={() => {
                                        onBuy(player);
                                        setMenuPlayerId(null);
                                      }}
                                    >
                                      <Icon name="shopping-cart" size={14} />{" "}
                                      Comprar
                                    </button>
                                  )}
                                  {player.club_id === null && (
                                    <button
                                      className="danger"
                                      onClick={() => {
                                        onDelete(player);
                                        setMenuPlayerId(null);
                                      }}
                                    >
                                      <Icon name="trash-2" size={14} /> Excluir
                                    </button>
                                  )}
                                </div>,
                                document.body,
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {players?.data.length === 0 && (
                <div className="player-no-results player-empty-list">
                  <span className="no-results-icon">
                    <Icon
                      name={hasFilters || f.free ? "search-x" : "users"}
                      size={17}
                    />
                  </span>
                  <b>
                    {f.free
                      ? "Nenhum jogador livre"
                      : f.clubOnly
                        ? "Nenhum jogador em clube"
                        : hasFilters
                          ? "Nenhum jogador encontrado"
                          : "Nenhum jogador cadastrado"}
                  </b>
                  <p>
                    {f.free
                      ? "Os jogadores contratados continuam em Todos ou Em clubes."
                      : f.clubOnly
                        ? "Contrate jogadores livres para preencher os elencos."
                        : hasFilters
                          ? "Confira a busca ou os filtros aplicados."
                          : "Cadastre jogadores para começar a montar os elencos."}
                  </p>
                  {hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  ) : !f.free && !f.clubOnly ? (
                    <Button onClick={onNew}>
                      <Icon name="plus" size={14} /> Novo jogador
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            <div className="table-footer">
              <span>
                Mostrando{" "}
                {players?.data.length
                  ? (f.page - 1) * (players.meta.limit || 10) + 1
                  : 0}
                –
                {players?.data.length
                  ? Math.min(f.page * (players.meta.limit || 10), total)
                  : 0}{" "}
                de {total} jogadores
              </span>
              <div className="pagination">
                <Button
                  variant="ghost"
                  disabled={f.page <= 1}
                  onClick={() => f.setPage(f.page - 1)}
                >
                  <Icon
                    name="chevron-right"
                    className="chevron-previous"
                    size={13}
                  />{" "}
                  Anterior
                </Button>
                <b>{f.page}</b>
                <Button
                  variant="ghost"
                  disabled={f.page >= (players?.meta.total_pages ?? 1)}
                  onClick={() => f.setPage(f.page + 1)}
                >
                  Próxima <Icon name="chevron-right" size={13} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Atualizar jogadores"
                  onClick={onRetry}
                >
                  <Icon name="refresh-cw" size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <p className="footnote">
        Os filtros se combinam. O valor de mercado considera condição, idade e
        agilidade, e os valores são calculados pela API.
      </p>
    </>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button className="filter-chip" onClick={onClear}>
      {label}
      <Icon name="x" size={12} />
    </button>
  );
}

function conditionLabel(condition: string) {
  if (condition === "MAL_CONDICIONADO") return "Mal condicionado";
  if (condition === "DOENTE") return "Doente";
  return "Apto";
}
