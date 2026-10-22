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
  const [page, setPage] = useState(1),
    [players, setPlayers] = useState<Page<Player> | null>(null),
    [search, setSearch] = useState(""),
    [position, setPosition] = useState(""),
    [condition, setCondition] = useState(""),
    [clubFilter, setClubFilter] = useState(""),
    [free, setFree] = useState(false),
    [sort, setSort] = useState("name"),
    [minAge, setMinAge] = useState(""),
    [maxAge, setMaxAge] = useState(""),
    [minValue, setMinValue] = useState(""),
    [maxValue, setMaxValue] = useState("");
  const [clubData, setClubData] = useState<
      (Club & { players: Player[] }) | null
    >(null),
    [clubTab, setClubTab] = useState<"roster" | "lineup" | "history">("roster"),
    [history, setHistory] = useState<TransactionHistory | null>(null),
    [historyType, setHistoryType] = useState(""),
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
    try {
      setClubs(await api<Club[]>("/clubs?sort=name"));
    } catch (e) {
      notify(messageOf(e), "error");
    }
  }, []);
  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const term = search.trim();
      const data = await api<Page<Player>>(
        `/players${queryString({ search: term.length >= 2 ? term : "", position, condition, free: free ? "true" : "", club_id: clubFilter || "", min_age: minAge, max_age: maxAge, min_value: minValue, max_value: maxValue, sort, page, limit: 10 })}`,
      );
      setPlayers(data);
    } catch (e) {
      notify(messageOf(e), "error");
    } finally {
      setLoading(false);
    }
  }, [
    search,
    position,
    condition,
    free,
    clubFilter,
    minAge,
    maxAge,
    minValue,
    maxValue,
    sort,
    page,
  ]);
  const loadClub = useCallback(async (id: number) => {
    try {
      setClubData(await api<Club & { players: Player[] }>(`/clubs/${id}`));
    } catch (e) {
      setClubData(null);
      notify(messageOf(e), "error");
    }
  }, []);
  const loadHistory = useCallback(
    async (id: number) => {
      try {
        setHistory(
          await api<TransactionHistory>(
            `/clubs/${id}/transactions${queryString({ type: historyType, player_id: historyPlayer })}`,
          ),
        );
      } catch (e) {
        setHistory(null);
        notify(messageOf(e), "error");
      }
    },
    [historyType, historyPlayer],
  );
  const loadLeague = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        api<Match[]>("/matches"),
        api<Standing[]>("/standings"),
      ]);
      setMatches(m);
      setStandings(s);
    } catch (e) {
      notify(messageOf(e), "error");
    }
  }, []);
  useEffect(() => {
    void loadClubs();
    void loadLeague();
  }, [loadClubs, loadLeague]);
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
    try {
      await action();
      notify(success);
      after?.();
      await loadClubs();
      if (section === "players") await loadPlayers();
      if (section === "clubs" && clubId) await loadClub(clubId);
      if (section === "clubs" && clubId && clubTab === "history")
        await loadHistory(clubId);
      await loadLeague();
    } catch (e) {
      notify(messageOf(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const openNewPlayer = () => {
    setEditing(null);
    setPlayerForm(emptyPlayer);
    setModal("player");
  };
  const openEdit = (p: Player) => {
    setEditing(p);
    setPlayerForm({ ...emptyPlayer, ...p });
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
      () => api("/clubs", { method: "POST", body: JSON.stringify(clubForm) }),
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
    await run(async () => {
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
    }, "Compra realizada.");
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
        setModal("result");
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
    setActivePlayer(p);
    setBuyForm({
      club_id: preferredBuyerClub || (clubs[0] ? String(clubs[0].id) : ""),
      loyalty_until: "",
    });
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
      setModal("result");
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
    busy,
    setBusy,
    loading,
    setLoading,
    page,
    setPage,
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
