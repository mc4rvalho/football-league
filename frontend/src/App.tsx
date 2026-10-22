import { Button, Card } from "./components/ui";
import { Home } from "./pages/HomePage";
import { PlayersView } from "./pages/PlayersPage";
import { ClubsView } from "./pages/ClubsPage";
import { MatchesView } from "./pages/MatchesPage";
import { StandingsView } from "./pages/StandingsPage";
import { AppDialogs } from "./components/AppDialogs";
import { useAppController } from "./hooks/useAppController";

export function App() {
  const app = useAppController();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => app.nav("home")}>
          <span className="brand-mark">P</span>
          <span>
            <b>Passe</b>
            <small>Gestão da liga</small>
          </span>
        </button>
        <div className="nav-group">
          <small>Mercado</small>
          <button
            className={
              app.section === "players" ? "nav-item selected" : "nav-item"
            }
            onClick={() => app.nav("players")}
          >
            ♙ <span>Jogadores</span>
            {app.players?.meta.total_items != null && (
              <i>{app.players.meta.total_items}</i>
            )}
          </button>
          <button
            className={
              app.section === "clubs" && !app.clubId
                ? "nav-item selected"
                : "nav-item"
            }
            onClick={() => {
              app.setClubId(null);
              app.nav("clubs");
            }}
          >
            ⬡ <span>Clubes</span>
            <i>{app.clubs.length}</i>
          </button>
        </div>
        <div className="nav-group">
          <small>Liga</small>
          <button
            className={
              app.section === "matches" ? "nav-item selected" : "nav-item"
            }
            onClick={() => app.nav("matches")}
          >
            ⚔ <span>Partidas</span>
          </button>
          <button
            className={
              app.section === "standings" ? "nav-item selected" : "nav-item"
            }
            onClick={() => app.nav("standings")}
          >
            ☷ <span>Classificação</span>
          </button>
        </div>
        <div className="nav-group club-nav">
          <small>
            Clubes <button onClick={() => app.setModal("club")}>＋</button>
          </small>
          {app.clubs.length === 0 ? (
            <p className="muted nav-empty">Nenhum clube ainda.</p>
          ) : (
            app.clubs.map((c) => (
              <button
                key={c.id}
                className={
                  app.section === "clubs" && app.clubId === c.id
                    ? "nav-item club-link selected"
                    : "nav-item club-link"
                }
                onClick={() => {
                  app.setClubId(c.id);
                  app.setClubTab("roster");
                  app.nav("clubs");
                }}
              >
                <span className="club-avatar">{app.initials(c.name)}</span>
                <span>{c.name}</span>
              </button>
            ))
          )}
        </div>
        <Card className="sidebar-footer">
          <strong>◉ Liga Fictícia</strong>
          <small>{app.clubs.length} clubes cadastrados</small>
          <span>◷ Horário de Brasília (UTC−3)</span>
        </Card>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="breadcrumbs">
            Passe <span>›</span> {app.title}
            {app.section === "clubs" && app.clubData && (
              <>
                {" "}
                <span>›</span> {app.clubData.name}
              </>
            )}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              void app.loadClubs();
              void app.loadLeague();
              if (app.section === "players") void app.loadPlayers();
              if (app.section === "clubs" && app.clubId)
                void app.loadClub(app.clubId);
            }}
            aria-label="Atualizar"
          >
            ↻
          </Button>
        </header>
        <div className="content">
          {app.section === "home" && (
            <Home clubs={app.clubs} matches={app.matches} onGo={app.nav} />
          )}
          {app.section === "players" && (
            <PlayersView
              players={app.players}
              clubs={app.clubs}
              loading={app.loading}
              filters={{
                search: app.search,
                setSearch: app.setSearch,
                position: app.position,
                setPosition: app.setPosition,
                condition: app.condition,
                setCondition: app.setCondition,
                clubFilter: app.clubFilter,
                setClubFilter: app.setClubFilter,
                free: app.free,
                setFree: app.setFree,
                sort: app.sort,
                setSort: app.setSort,
                minAge: app.minAge,
                setMinAge: app.setMinAge,
                maxAge: app.maxAge,
                setMaxAge: app.setMaxAge,
                minValue: app.minValue,
                setMinValue: app.setMinValue,
                maxValue: app.maxValue,
                setMaxValue: app.setMaxValue,
                page: app.page,
                setPage: app.setPage,
              }}
              onNew={app.openNewPlayer}
              onEdit={app.openEdit}
              onBuy={app.openBuy}
              onDetails={(p) => {
                app.setActivePlayer(p);
                app.setModal("details");
              }}
              onCondition={(p) => {
                app.setActivePlayer(p);
                app.setModal("condition");
              }}
              onDelete={(p) => {
                app.setActivePlayer(p);
                app.setModal("delete");
              }}
              onRetry={app.loadPlayers}
            />
          )}
          {app.section === "clubs" && (
            <ClubsView
              clubs={app.clubs}
              club={app.clubData}
              clubId={app.clubId}
              tab={app.clubTab}
              setTab={app.setClubTab}
              onNew={() => app.setModal("club")}
              onSelect={(id) => app.setClubId(id)}
              onMarket={() => {
                app.setPreferredBuyerClub(String(app.clubId));
                app.setFree(true);
                app.setClubFilter("");
                app.nav("players");
              }}
              onSell={(p) => {
                app.setActivePlayer(p);
                app.setModal("sell");
              }}
              onEditLineup={app.openLineup}
              history={app.history}
              historyType={app.historyType}
              setHistoryType={app.setHistoryType}
              historyPlayer={app.historyPlayer}
              setHistoryPlayer={app.setHistoryPlayer}
              onExport={app.downloadCsv}
              onRetry={() => app.clubId && app.loadClub(app.clubId)}
            />
          )}
          {app.section === "matches" && (
            <MatchesView
              clubs={app.clubs}
              matches={app.matches}
              onNew={() => {
                app.setMatchForm({
                  home_club_id: app.clubs[0] ? String(app.clubs[0].id) : "",
                  away_club_id: app.clubs[1] ? String(app.clubs[1].id) : "",
                });
                app.setModal("match");
              }}
              onDetails={app.showMatch}
            />
          )}
          {app.section === "standings" && (
            <StandingsView
              rows={app.standings}
              onNew={() => {
                app.setMatchForm({
                  home_club_id: app.clubs[0] ? String(app.clubs[0].id) : "",
                  away_club_id: app.clubs[1] ? String(app.clubs[1].id) : "",
                });
                app.setModal("match");
              }}
              onMatches={() => app.nav("matches")}
            />
          )}
        </div>
      </main>
      {app.notice && (
        <div className={`toast toast-${app.notice.kind}`} role="status">
          <b>{app.notice.kind === "success" ? "✓" : "!"}</b>
          {app.notice.text}
          {app.notice.kind === "error" && (
            <Button
              variant="outline"
              onClick={() => {
                if (app.section === "players") void app.loadPlayers();
                else if (app.section === "clubs" && app.clubId) {
                  if (app.clubTab === "history")
                    void app.loadHistory(app.clubId);
                  else void app.loadClub(app.clubId);
                } else if (
                  app.section === "matches" ||
                  app.section === "standings" ||
                  app.section === "home"
                )
                  void app.loadLeague();
                void app.loadClubs();
              }}
            >
              Tentar de novo
            </Button>
          )}
          <button onClick={() => app.setNotice(null)}>×</button>
        </div>
      )}
      <AppDialogs controller={app} />
    </div>
  );
}
