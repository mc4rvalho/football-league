import { Button, Card } from "./components/ui";
import { Home } from "./pages/HomePage";
import { PlayersView } from "./pages/PlayersPage";
import { ClubsView } from "./pages/ClubsPage";
import { MatchDetailView, MatchesView } from "./pages/MatchesPage";
import { StandingsView } from "./pages/StandingsPage";
import { AppDialogs } from "./components/AppDialogs";
import { useAppController } from "./hooks/useAppController";
import { Icon } from "./components/Icon";

export function App() {
  const app = useAppController();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => app.nav("home")}>
          <img className="brand-mark-image" src="/passe-mark.svg" alt="" />
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
            <Icon name="users" /> <span>Jogadores</span>
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
            <Icon name="shield" /> <span>Clubes</span>
            <i>{app.clubs.length}</i>
          </button>
        </div>
        <div className="nav-group">
          <small>Liga</small>
          <button
            className={
              app.section === "matches" || app.section === "match-detail"
                ? "nav-item selected"
                : "nav-item"
            }
            onClick={() => app.nav("matches")}
          >
            <Icon name="swords" /> <span>Partidas</span>
            <i>{app.matches.length}</i>
          </button>
          <button
            className={
              app.section === "standings" ? "nav-item selected" : "nav-item"
            }
            onClick={() => app.nav("standings")}
          >
            <Icon name="list-ordered" /> <span>Classificação</span>
          </button>
        </div>
        <div className="nav-group club-nav">
          <small>
            Clubes{" "}
            <button
              aria-label="Novo clube"
              onClick={() => {
                app.setActionError(null);
                app.setModal("club");
              }}
            >
              <Icon name="plus" />
            </button>
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
                <span className="club-avatar">
                  {app.initials(c.name).slice(0, 1)}
                </span>
                <span>{c.name}</span>
              </button>
            ))
          )}
        </div>
        <Card className="sidebar-footer">
          <strong>
            <Icon name="trophy" /> Liga Fictícia
          </strong>
          <small>
            {app.clubs.length} clubes · {app.playerSummary.total} jogadores
          </small>
          {app.matches[0] && (
            <button
              className="sidebar-latest-match"
              onClick={() => void app.showMatch(app.matches[0])}
            >
              <Icon name="swords" size={15} />
              <span>
                <b>Última partida</b>
                <small>
                  {app.matches[0].home.club_name} {app.matches[0].home.goals} ×{" "}
                  {app.matches[0].away.goals} {app.matches[0].away.club_name}
                </small>
              </span>
            </button>
          )}
          <span>
            <Icon name="clock" /> Horário de Brasília (UTC−3)
          </span>
        </Card>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="breadcrumbs">
            Passe <span>›</span>{" "}
            {app.section === "match-detail" ? "Liga" : app.title}
            {app.section === "clubs" && app.clubData && (
              <>
                {" "}
                <span>›</span> {app.clubData.name}
              </>
            )}
            {app.section === "match-detail" && app.selectedMatch && (
              <>
                {" "}
                <span>›</span> Partidas <span>›</span>{" "}
                {app.selectedMatch.home.club_name}{" "}
                {app.selectedMatch.home.goals} × {app.selectedMatch.away.goals}{" "}
                {app.selectedMatch.away.club_name}
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
            <Icon name="refresh-cw" />
          </Button>
        </header>
        <div className="content">
          {app.section === "home" && (
            <Home
              clubs={app.clubs}
              matches={app.matches}
              playerCount={app.playerSummary.total}
              freeCount={app.playerSummary.free}
              onGo={app.nav}
            />
          )}
          {app.section === "players" && (
            <PlayersView
              players={app.players}
              clubs={app.clubs}
              counts={app.playerCounts}
              loading={app.loading}
              loadError={app.listStatus.players.error}
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
                clubOnly: app.clubOnly,
                setClubOnly: app.setClubOnly,
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
                app.setActionError(null);
                app.setActivePlayer(p);
                app.setModal("details");
              }}
              onCondition={(p) => {
                app.setActionError(null);
                app.setActivePlayer(p);
                app.setModal("condition");
              }}
              onDelete={(p) => {
                app.setActionError(null);
                app.setActivePlayer(p);
                app.setModal("delete");
              }}
              onRetry={app.loadPlayers}
            />
          )}
          {app.section === "clubs" && (
            <ClubsView
              clubs={app.clubs}
              clubsLoading={app.listStatus.clubs.loading}
              clubsError={app.listStatus.clubs.error}
              club={app.clubData}
              clubLoading={app.listStatus.club.loading}
              clubError={app.listStatus.club.error}
              clubId={app.clubId}
              tab={app.clubTab}
              setTab={app.setClubTab}
              onNew={() => {
                app.setActionError(null);
                app.setModal("club");
              }}
              onSelect={(id) => app.setClubId(id)}
              onMarket={() => {
                app.setPreferredBuyerClub(String(app.clubId));
                app.setFree(true);
                app.setClubFilter("");
                app.nav("players");
              }}
              onSell={(p) => {
                app.setActionError(null);
                app.setActivePlayer(p);
                app.setModal("sell");
              }}
              lineupForm={app.lineupForm}
              setLineupForm={app.setLineupForm}
              onSaveLineup={app.saveLineup}
              busy={app.busy}
              actionError={app.actionError}
              onClearActionError={() => app.setActionError(null)}
              history={app.history}
              historyLoading={app.listStatus.history.loading}
              historyError={app.listStatus.history.error}
              historyType={app.historyType}
              setHistoryType={app.setHistoryType}
              historyPlayer={app.historyPlayer}
              setHistoryPlayer={app.setHistoryPlayer}
              onExport={app.downloadCsv}
              onRetry={() => app.clubId && app.loadClub(app.clubId)}
              onRetryHistory={() => app.clubId && app.loadHistory(app.clubId)}
            />
          )}
          {app.section === "matches" && (
            <MatchesView
              clubs={app.clubs}
              matches={app.matches}
              loading={app.listStatus.matches.loading}
              loadError={app.listStatus.matches.error}
              onRetry={app.loadLeague}
              onNew={() => {
                app.setActionError(null);
                app.setMatchForm({
                  home_club_id: app.clubs[0] ? String(app.clubs[0].id) : "",
                  away_club_id: app.clubs[1] ? String(app.clubs[1].id) : "",
                });
                app.setModal("match");
              }}
              onDetails={app.showMatch}
            />
          )}
          {app.section === "match-detail" && app.selectedMatch && (
            <MatchDetailView
              match={app.selectedMatch}
              onBack={() => app.nav("matches")}
            />
          )}
          {app.section === "standings" && (
            <StandingsView
              rows={app.standings}
              matches={app.matches}
              loading={app.listStatus.standings.loading}
              loadError={app.listStatus.standings.error}
              onRetry={app.loadLeague}
              onNew={() => {
                app.setActionError(null);
                app.setMatchForm({
                  home_club_id: app.clubs[0] ? String(app.clubs[0].id) : "",
                  away_club_id: app.clubs[1] ? String(app.clubs[1].id) : "",
                });
                app.setModal("match");
              }}
              onMatches={() => app.nav("matches")}
              onDetails={app.showMatch}
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
