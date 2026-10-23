import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, apiBaseUrl, queryString } from "../services/api";
import { initials } from "../components/formatters";
import type {
  Club,
  Lineup,
  Match,
  Page,
  Player,
  Position,
  Standing,
  TransactionHistory,
  TransactionReceipt,
} from "../lib/types";
import type { Section } from "../pages/HomePage";

/* eslint-disable react-hooks/set-state-in-effect -- These effects initiate API fetches when the selected screen or resource changes. */

const positions: Position[] = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
const formations = ["3-1", "2-2", "2-1-1", "1-2-1"];
const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : "Não foi possível concluir a solicitação.";
const emptyPlayer = {
  name: "",
  position: "MEI" as Position,
  agility: 70,
  age: 23,
  pace: 66,
  shooting: 62,
  passing: 74,
  dribbling: 70,
  defending: 48,
  physical: 58,
  potential: 82,
};
type ListKey =
  "players" | "clubs" | "club" | "history" | "matches" | "standings";
type ListStatus = { loading: boolean; error: string | null };

export function useAppController() {
  const [section, setSection] = useState<Section>("home"),
    [clubs, setClubs] = useState<Club[]>([]),
    [clubId, setClubId] = useState<number | null>(null);
  const [preferredBuyerClub, setPreferredBuyerClub] = useState("");
  const [notice, setNotice] = useState<{
      kind: "success" | "error";
      text: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [listStatus, setListStatus] = useState<Record<ListKey, ListStatus>>({
    players: { loading: false, error: null },
    clubs: { loading: false, error: null },
    club: { loading: false, error: null },
    history: { loading: false, error: null },
    matches: { loading: false, error: null },
    standings: { loading: false, error: null },
  });
  const updateListStatus = useCallback(
    (key: ListKey, status: Partial<ListStatus>) =>
      setListStatus((current) => ({
        ...current,
        [key]: { ...current[key], ...status },
      })),
    [],
  );
  const [page, setPage] = useState(1),
    [players, setPlayers] = useState<Page<Player> | null>(null),
    [search, setSearch] = useState(""),
    [position, setPosition] = useState(""),
    [condition, setCondition] = useState(""),
    [clubFilter, setClubFilter] = useState(""),
    [free, setFree] = useState(false),
    [clubOnly, setClubOnly] = useState(false),
    [sort, setSort] = useState("name"),
    [minAge, setMinAge] = useState(""),
    [maxAge, setMaxAge] = useState(""),
    [minValue, setMinValue] = useState(""),
    [maxValue, setMaxValue] = useState("");
  const [playerSummary, setPlayerSummary] = useState({
    total: 0,
    free: 0,
    inClubs: 0,
  });
  const [playerCounts, setPlayerCounts] = useState({
    total: 0,
    free: 0,
    inClubs: 0,
  });
  const [clubData, setClubData] = useState<
      (Club & { players: Player[] }) | null
    >(null),
    [clubTab, setClubTab] = useState<"roster" | "lineup" | "history">("roster"),
    [history, setHistory] = useState<TransactionHistory | null>(null),
    [historyType, setHistoryType] = useState("COMPRA,VENDA"),
    [historyPlayer, setHistoryPlayer] = useState("");
  const [matches, setMatches] = useState<Match[]>([]),
    [selectedMatch, setSelectedMatch] = useState<Match | null>(null),
    [standings, setStandings] = useState<Standing[]>([]),
    [modal, setModal] = useState(""),
    [editing, setEditing] = useState<Player | null>(null),
    [activePlayer, setActivePlayer] = useState<Player | null>(null),
    [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [playerForm, setPlayerForm] = useState(emptyPlayer),
    [clubForm, setClubForm] = useState({ name: "", acronym: "" }),
    [buyForm, setBuyForm] = useState({ club_id: "", loyalty_until: "" }),
    [matchForm, setMatchForm] = useState({
      home_club_id: "",
      away_club_id: "",
    }),
    [lineupForm, setLineupForm] = useState({
      formation: "2-1-1",
      player_ids: [] as number[],
    });
  const notify = (text: string, kind: "success" | "error" = "success") => {
    setNotice({ text, kind });
    window.setTimeout(() => setNotice(null), 5000);
  };
  const loadClubs = useCallback(async () => {
    updateListStatus("clubs", { loading: true, error: null });
    try {
      setClubs(await api<Club[]>("/clubs?sort=name"));
    } catch (e) {
      setClubs([]);
      updateListStatus("clubs", { error: messageOf(e) });
    } finally {
      updateListStatus("clubs", { loading: false });
    }
  }, [updateListStatus]);
  const loadPlayers = useCallback(async () => {
    setLoading(true);
    updateListStatus("players", { loading: true, error: null });
    try {
      const term = search.trim();
      const sharedFilters = {
        search: term.length >= 2 ? term : "",
        position,
        condition,
        club_id: clubFilter || "",
        min_age: minAge,
        max_age: maxAge,
        min_value: minValue,
        max_value: maxValue,
      };
      const [data, allCount, freeCount, clubCount] = await Promise.all([
        api<Page<Player>>(
          `/players${queryString({ ...sharedFilters, free: free ? "true" : "", in_club: clubOnly ? "true" : "", sort, page, limit: 10 })}`,
        ),
        api<Page<Player>>(
          `/players${queryString({ ...sharedFilters, sort, page: 1, limit: 1 })}`,
        ),
        api<Page<Player>>(
          `/players${queryString({ ...sharedFilters, club_id: "", free: "true", sort, page: 1, limit: 1 })}`,
        ),
        api<Page<Player>>(
          `/players${queryString({ ...sharedFilters, in_club: "true", sort, page: 1, limit: 1 })}`,
        ),
      ]);
      setPlayers(data);
      setPlayerCounts({
        total: allCount.meta.total_items,
        free: freeCount.meta.total_items,
        inClubs: clubCount.meta.total_items,
      });
    } catch (e) {
      setPlayers(null);
      updateListStatus("players", { error: messageOf(e) });
    } finally {
      setLoading(false);
      updateListStatus("players", { loading: false });
    }
  }, [
    search,
    position,
    condition,
    free,
    clubOnly,
    clubFilter,
    minAge,
    maxAge,
    minValue,
    maxValue,
    sort,
    page,
    updateListStatus,
  ]);
  const loadPlayerSummary = useCallback(async () => {
    try {
      const result = await api<Page<Player>>("/players?limit=100");
      setPlayerSummary({
        total: result.meta.total_items,
        free: result.data.filter((player) => player.club_id === null).length,
        inClubs: result.data.filter((player) => player.club_id !== null).length,
      });
    } catch {
      setPlayerSummary({ total: 0, free: 0, inClubs: 0 });
    }
  }, []);
  const loadClub = useCallback(
    async (id: number) => {
      updateListStatus("club", { loading: true, error: null });
      try {
        setClubData(await api<Club & { players: Player[] }>(`/clubs/${id}`));
      } catch (e) {
        setClubData(null);
        updateListStatus("club", { error: messageOf(e) });
      } finally {
        updateListStatus("club", { loading: false });
      }
    },
    [updateListStatus],
  );
  const loadHistory = useCallback(
    async (id: number) => {
      updateListStatus("history", { loading: true, error: null });
      try {
        setHistory(
          await api<TransactionHistory>(
            `/clubs/${id}/transactions${queryString({ type: historyType, player_id: historyPlayer, limit: 100 })}`,
          ),
        );
      } catch (e) {
        setHistory(null);
        updateListStatus("history", { error: messageOf(e) });
      } finally {
        updateListStatus("history", { loading: false });
      }
    },
    [historyType, historyPlayer, updateListStatus],
  );
  const loadLeague = useCallback(async () => {
    updateListStatus("matches", { loading: true, error: null });
    updateListStatus("standings", { loading: true, error: null });
    try {
      const [m, s] = await Promise.all([
        api<Match[]>("/matches"),
        api<Standing[]>("/standings"),
      ]);
      setMatches(m);
      setStandings(s);
    } catch (e) {
      setMatches([]);
      setStandings([]);
      updateListStatus("matches", { error: messageOf(e) });
      updateListStatus("standings", { error: messageOf(e) });
    } finally {
      updateListStatus("matches", { loading: false });
      updateListStatus("standings", { loading: false });
    }
  }, [updateListStatus]);
  useEffect(() => {
    void loadClubs();
    void loadLeague();
    void loadPlayerSummary();
  }, [loadClubs, loadLeague, loadPlayerSummary]);
  useEffect(() => {
    if (section === "players") void loadPlayers();
  }, [section, loadPlayers]);
  useEffect(() => {
    if (section === "clubs" && clubId) void loadClub(clubId);
  }, [section, clubId, loadClub]);
  useEffect(() => {
    if (section === "clubs" && clubId && clubTab === "history")
      void loadHistory(clubId);
  }, [section, clubId, clubTab, loadHistory]);
  const run = async (
    action: () => Promise<unknown>,
    success: string,
    after?: () => void,
  ) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      notify(success);
      after?.();
      await loadClubs();
      await loadPlayerSummary();
      if (section === "players") await loadPlayers();
      if (section === "clubs" && clubId) await loadClub(clubId);
      if (section === "clubs" && clubId && clubTab === "history")
        await loadHistory(clubId);
      await loadLeague();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const openNewPlayer = () => {
    setEditing(null);
    setPlayerForm(emptyPlayer);
    setActionError(null);
    setModal("player");
  };
  const openEdit = (p: Player) => {
    setEditing(p);
    setPlayerForm({ ...emptyPlayer, ...p });
    setActionError(null);
    setModal("player");
  };
  const savePlayer = async (e: FormEvent) => {
    e.preventDefault();
    await run(
      async () => {
        const result = await api<Player>(
          editing ? `/players/${editing.id}` : "/players",
          {
            method: editing ? "PUT" : "POST",
            body: JSON.stringify(
              editing
                ? {
                    name: playerForm.name,
                    position: playerForm.position,
                    agility: Number(playerForm.agility),
                    age: Number(playerForm.age),
                  }
                : {
                    ...playerForm,
                    agility: Number(playerForm.agility),
                    age: Number(playerForm.age),
                    pace: Number(playerForm.pace),
                    shooting: Number(playerForm.shooting),
                    passing: Number(playerForm.passing),
                    dribbling: Number(playerForm.dribbling),
                    defending: Number(playerForm.defending),
                    physical: Number(playerForm.physical),
                    potential: Number(playerForm.potential),
                  },
            ),
          },
        );
        if (!editing) {
          setActivePlayer(result);
          setModal("created-player");
        }
      },
      editing ? "Jogador atualizado." : "Jogador cadastrado.",
      () => {
        if (editing) setModal("");
      },
    );
  };
  const saveClub = async (e: FormEvent) => {
    e.preventDefault();
    await run(
      () =>
        api("/clubs", {
          method: "POST",
          body: JSON.stringify({
            name: clubForm.name,
            sigla: clubForm.acronym,
          }),
        }),
      "Clube criado.",
      () => {
        setModal("");
        setClubForm({ name: "", acronym: "" });
      },
    );
  };
  const buyPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!activePlayer) return;
    const loyalty = buyForm.loyalty_until
      ? `${buyForm.loyalty_until}:00-03:00`
      : "";
    await run(
      async () => {
        const result = await api<TransactionReceipt>(
          `/players/${activePlayer.id}/buy`,
          {
            method: "POST",
            body: JSON.stringify({
              club_id: Number(buyForm.club_id),
              loyalty_until: loyalty,
            }),
          },
        );
        setReceipt(result);
        setModal("receipt");
      },
      "Compra realizada.",
      () => {
        setFree(false);
        setClubOnly(false);
        setClubFilter("");
        setPage(1);
      },
    );
  };
  const sellPlayer = async () => {
    if (!activePlayer) return;
    await run(async () => {
      const result = await api<TransactionReceipt>(
        `/players/${activePlayer.id}/sell`,
        { method: "POST" },
      );
      setReceipt(result);
      setModal("receipt");
    }, "Venda concluída.");
  };
  const saveLineup = async (e: FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    await run(
      () =>
        api(`/clubs/${clubId}/lineup`, {
          method: "PUT",
          body: JSON.stringify({
            ...lineupForm,
            player_ids: lineupForm.player_ids.filter(Boolean),
          }),
        }),
      "Escalação salva.",
      () => setModal(""),
    );
  };
  const playMatch = async (e: FormEvent) => {
    e.preventDefault();
    await run(
      async () => {
        const m = await api<Match>("/matches", {
          method: "POST",
          body: JSON.stringify({
            home_club_id: Number(matchForm.home_club_id),
            away_club_id: Number(matchForm.away_club_id),
          }),
        });
        setSelectedMatch(m);
        setModal("");
        setSection("match-detail");
      },
      "Partida jogada.",
      () => {},
    );
  };
  const downloadCsv = async () => {
    if (!clubId) return;
    try {
      const res = await fetch(
        `${apiBaseUrl}/clubs/${clubId}/transactions/export${queryString({ type: historyType, player_id: historyPlayer })}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Falha ao exportar CSV.");
      }
      const blob = await res.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `historico-clube-${clubId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify("CSV baixado.");
    } catch (e) {
      notify(messageOf(e), "error");
    }
  };
  const openBuy = (p: Player) => {
    const loyaltyDate = new Date();
    loyaltyDate.setDate(loyaltyDate.getDate() + 365);
    loyaltyDate.setHours(15, 0, 0, 0);
    const localDateTime = new Date(
      loyaltyDate.getTime() - loyaltyDate.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    setActivePlayer(p);
    setBuyForm({
      club_id: preferredBuyerClub || (clubs[0] ? String(clubs[0].id) : ""),
      loyalty_until: localDateTime,
    });
    setActionError(null);
    setModal("buy");
  };
  const openLineup = async () => {
    if (!clubId) return;
    try {
      const current = await api<Lineup>(`/clubs/${clubId}/lineup`);
      setLineupForm({
        formation: current.formation || "2-1-1",
        player_ids: current.players.map((player) => player.id),
      });
      setModal("lineup");
    } catch (error) {
      notify(messageOf(error), "error");
    }
  };
  const showMatch = async (match: Match) => {
    try {
      setSelectedMatch(await api<Match>(`/matches/${match.id}`));
      setModal("");
      setSection("match-detail");
    } catch (error) {
      notify(messageOf(error), "error");
    }
  };
  const nav = (s: Section) => {
    setSection(s);
    setModal("");
  };
  const title =
    section === "players"
      ? "Jogadores"
      : section === "clubs"
        ? "Clubes"
        : section === "matches"
          ? "Partidas"
          : section === "match-detail"
            ? "Detalhes da partida"
            : section === "standings"
              ? "Classificação"
              : "Gestão da liga";
  return {
    section,
    clubs,
    clubId,
    setSection,
    setClubs,
    setClubId,
    preferredBuyerClub,
    setPreferredBuyerClub,
    notice,
    setNotice,
    actionError,
    listStatus,
    setActionError,
    busy,
    setBusy,
    loading,
    setLoading,
    page,
    setPage,
    playerSummary,
    playerCounts,
    loadPlayerSummary,
    players,
    setPlayers,
    search,
    setSearch,
    position,
    setPosition,
    condition,
    setCondition,
    clubFilter,
    setClubFilter,
    free,
    setFree,
    clubOnly,
    setClubOnly,
    sort,
    setSort,
    minAge,
    setMinAge,
    maxAge,
    setMaxAge,
    minValue,
    setMinValue,
    maxValue,
    setMaxValue,
    clubData,
    setClubData,
    clubTab,
    setClubTab,
    history,
    setHistory,
    historyType,
    setHistoryType,
    historyPlayer,
    setHistoryPlayer,
    matches,
    setMatches,
    selectedMatch,
    setSelectedMatch,
    standings,
    setStandings,
    modal,
    setModal,
    editing,
    setEditing,
    activePlayer,
    setActivePlayer,
    receipt,
    setReceipt,
    playerForm,
    setPlayerForm,
    clubForm,
    setClubForm,
    buyForm,
    setBuyForm,
    matchForm,
    setMatchForm,
    lineupForm,
    setLineupForm,
    notify,
    loadClubs,
    loadPlayers,
    loadClub,
    loadHistory,
    loadLeague,
    run,
    openNewPlayer,
    openEdit,
    savePlayer,
    saveClub,
    buyPlayer,
    sellPlayer,
    saveLineup,
    playMatch,
    downloadCsv,
    openBuy,
    openLineup,
    showMatch,
    nav,
    title,
    positions,
    formations,
    initials,
  };
}
