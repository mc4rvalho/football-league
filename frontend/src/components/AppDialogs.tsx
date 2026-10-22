import { Button, Dialog, Field, Input, Select } from "./ui";
import { api } from "../services/api";
import { LineupPicker } from "../pages/ClubsPage";
import { MatchResult } from "../pages/MatchesPage";
import { positionName } from "./formatters";
import type { Position } from "../lib/types";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerSummary } from "./PlayerSummary";
import { ReceiptRow } from "./ReceiptRow";
import { dateTime, money } from "./formatters";
import { useAppController } from "../hooks/useAppController";

type Controller = ReturnType<typeof useAppController>;

export function AppDialogs({ controller: c }: { controller: Controller }) {
  const {
    modal,
    setModal,
    editing,
    playerForm,
    setPlayerForm,
    savePlayer,
    busy,
    clubForm,
    setClubForm,
    saveClub,
    activePlayer,
    clubData,
    buyForm,
    setBuyForm,
    clubs,
    buyPlayer,
    sellPlayer,
    receipt,
    setClubId,
    setClubTab,
    nav,
    run,
    saveLineup,
    lineupForm,
    setLineupForm,
    playMatch,
    matchForm,
    setMatchForm,
    selectedMatch,
    positions,
    formations,
  } = c;
  return (
    <>
      <Dialog
        open={modal === "player"}
        title={editing ? "Editar jogador" : "Novo jogador"}
        description={
          editing
            ? "Atualize os dados cadastrais. Os indicadores técnicos são mantidos."
            : "Preencha os dados e indicadores técnicos do atleta."
        }
        onClose={() => setModal("")}
      >
        <form className="form-grid" onSubmit={savePlayer}>
          <Field label="Nome">
            <Input
              required
              minLength={3}
              maxLength={100}
              value={playerForm.name}
              onChange={(e) =>
                setPlayerForm({ ...playerForm, name: e.target.value })
              }
              placeholder="Ex.: Meia Lua"
            />
          </Field>
          <Field label="Posição">
            <Select
              value={playerForm.position}
              onChange={(e) =>
                setPlayerForm({
                  ...playerForm,
                  position: e.target.value as Position,
                })
              }
            >
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p} · {positionName[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Idade">
            <Input
              required
              type="number"
              min={16}
              max={45}
              value={playerForm.age}
              onChange={(e) =>
                setPlayerForm({ ...playerForm, age: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Agilidade">
            <Input
              required
              type="number"
              min={1}
              max={100}
              value={playerForm.agility}
              onChange={(e) =>
                setPlayerForm({
                  ...playerForm,
                  agility: Number(e.target.value),
                })
              }
            />
          </Field>
          {!editing && (
            <div className="attributes-grid">
              {(
                [
                  "pace",
                  "shooting",
                  "passing",
                  "dribbling",
                  "defending",
                  "physical",
                  "potential",
                ] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={
                    {
                      pace: "Velocidade",
                      shooting: "Finalização",
                      passing: "Passe",
                      dribbling: "Drible",
                      defending: "Defesa",
                      physical: "Físico",
                      potential: "Potencial",
                    }[k]
                  }
                >
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={playerForm[k]}
                    onChange={(e) =>
                      setPlayerForm({
                        ...playerForm,
                        [k]: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          )}
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModal("")}
            >
              Cancelar
            </Button>
            <Button disabled={busy}>
              {busy
                ? "Salvando…"
                : editing
                  ? "Salvar alterações"
                  : "Salvar jogador"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "club"}
        title="Novo clube"
        description="Informe o nome e a sigla do clube."
        onClose={() => setModal("")}
      >
        <form className="form-stack" onSubmit={saveClub}>
          <Field label="Nome">
            <Input
              required
              minLength={3}
              maxLength={60}
              value={clubForm.name}
              onChange={(e) =>
                setClubForm({ ...clubForm, name: e.target.value })
              }
              placeholder="Ex.: Águias FC"
            />
          </Field>
          <Field label="Sigla" help="3 letras maiúsculas.">
            <Input
              required
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              value={clubForm.acronym}
              onChange={(e) =>
                setClubForm({
                  ...clubForm,
                  acronym: e.target.value.toUpperCase(),
                })
              }
              placeholder="AGU"
            />
          </Field>
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModal("")}
            >
              Cancelar
            </Button>
            <Button disabled={busy}>Criar clube</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "buy"}
        title="Comprar jogador"
        description="Escolha o clube comprador e o fim da fidelidade."
        onClose={() => setModal("")}
      >
        <form className="form-stack" onSubmit={buyPlayer}>
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <Field label="Clube comprador">
            <Select
              required
              value={buyForm.club_id}
              onChange={(e) =>
                setBuyForm({ ...buyForm, club_id: e.target.value })
              }
            >
              <option value="">Selecione um clube</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · caixa {money(c.cash)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fim da fidelidade">
            <Input
              type="datetime-local"
              required
              value={buyForm.loyalty_until}
              onChange={(e) =>
                setBuyForm({ ...buyForm, loyalty_until: e.target.value })
              }
            />
          </Field>
          <p className="hint">
            A taxa de compra e o caixa serão calculados pela API; o custo total
            deve respeitar o limite de 50% do caixa.
          </p>
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModal("")}
            >
              Cancelar
            </Button>
            <Button disabled={busy || !clubs.length}>Confirmar compra</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "sell"}
        title="Confirmar venda"
        description="O jogador sairá do elenco e ficará livre."
        onClose={() => setModal("")}
      >
        <div className="form-stack">
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <p>
            O valor de venda, multa, comissão e crédito no caixa serão
            calculados pela API.
          </p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setModal("")}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void sellPlayer()}
            >
              Confirmar venda
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={modal === "receipt"}
        title={
          receipt?.type === "COMPRA" ? "Compra concluída" : "Venda concluída"
        }
        description={activePlayer?.name}
        onClose={() => setModal("")}
      >
        {receipt && (
          <div className="form-stack">
            <div className="receipt-list">
              {receipt.type === "COMPRA" ? (
                <>
                  <ReceiptRow
                    label="Valor de mercado"
                    value={money(receipt.value)}
                  />
                  <ReceiptRow label="Taxa" value={money(receipt.fee)} />
                  <ReceiptRow
                    label="Custo total"
                    value={money(receipt.value + receipt.fee)}
                    strong
                  />
                  <ReceiptRow
                    label="Fim da fidelidade"
                    value={
                      receipt.contract?.loyalty_until
                        ? dateTime(receipt.contract.loyalty_until)
                        : "—"
                    }
                  />
                  <ReceiptRow
                    label="Contrato"
                    value={receipt.contract?.status ?? "ATIVO"}
                  />
                </>
              ) : (
                <>
                  <ReceiptRow
                    label="Valor de compra"
                    value={money(receipt.purchase_value)}
                  />
                  <ReceiptRow
                    label="Valor de venda"
                    value={money(receipt.value)}
                  />
                  <ReceiptRow
                    label="Dias restantes"
                    value={receipt.remaining_days ?? 0}
                  />
                  <ReceiptRow label="Multa" value={money(receipt.penalty)} />
                  <ReceiptRow
                    label="Lucro"
                    value={receipt.profit == null ? "—" : money(receipt.profit)}
                  />
                  <ReceiptRow label="Comissão" value={money(receipt.fee)} />
                  <ReceiptRow
                    label="Crédito no caixa"
                    value={money(receipt.cash_change)}
                  />
                  <ReceiptRow
                    label="Contrato"
                    value={receipt.contract_status ?? "ENCERRADO"}
                  />
                </>
              )}
              <ReceiptRow
                label="Novo caixa do clube"
                value={money(receipt.club_cash)}
                strong
              />
            </div>
            <div className="dialog-actions">
              <Button
                variant="outline"
                onClick={() => {
                  const id =
                    receipt.type === "COMPRA"
                      ? Number(buyForm.club_id)
                      : activePlayer?.club_id;
                  if (id) {
                    setClubId(id);
                    setClubTab("roster");
                    nav("clubs");
                  } else setModal("");
                }}
              >
                Ver clube
              </Button>
              <Button onClick={() => setModal("")}>Fechar</Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={modal === "delete"}
        title={`Excluir ${activePlayer?.name ?? "jogador"}?`}
        description="A exclusão é lógica e não remove transações anteriores."
        onClose={() => setModal("")}
      >
        <div className="form-stack">
          <p>Este jogador será removido da lista do mercado.</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setModal("")}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                activePlayer &&
                void run(
                  () =>
                    api(`/players/${activePlayer.id}`, { method: "DELETE" }),
                  "Jogador excluído.",
                  () => setModal(""),
                )
              }
            >
              Excluir jogador
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={modal === "condition"}
        title="Alterar condição física"
        onClose={() => setModal("")}
      >
        <div className="form-stack">
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <Field label="Nova condição">
            <Select id="new-condition" defaultValue={activePlayer?.condition}>
              <option value="APTO">Apto</option>
              <option value="MAL_CONDICIONADO">Mal condicionado</option>
              <option value="DOENTE">Doente</option>
            </Select>
          </Field>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setModal("")}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                const el = document.getElementById(
                  "new-condition",
                ) as HTMLSelectElement | null;
                if (activePlayer && el)
                  void run(
                    () =>
                      api(`/players/${activePlayer.id}/condition`, {
                        method: "PATCH",
                        body: JSON.stringify({ condition: el.value }),
                      }),
                    "Condição atualizada.",
                    () => setModal(""),
                  );
              }}
            >
              Salvar condição
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={modal === "details"}
        title={activePlayer?.name ?? "Detalhes do jogador"}
        description={
          activePlayer
            ? `${positionName[activePlayer.position]} · ${activePlayer.age} anos`
            : ""
        }
        onClose={() => setModal("")}
      >
        {activePlayer && <PlayerDetails player={activePlayer} />}
      </Dialog>
      <Dialog
        open={modal === "created-player"}
        title="Jogador cadastrado"
        description="Valores calculados pela API no cadastro."
        onClose={() => setModal("")}
      >
        {activePlayer && (
          <div className="form-stack">
            <PlayerDetails player={activePlayer} />
            <div className="dialog-actions">
              <Button onClick={() => setModal("")}>Fechar</Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={modal === "lineup"}
        title="Escalação"
        description="Escolha uma formação e um titular para cada vaga."
        onClose={() => setModal("")}
      >
        <form className="form-stack" onSubmit={saveLineup}>
          <Field label="Formação">
            <Select
              value={lineupForm.formation}
              onChange={(e) =>
                setLineupForm({
                  ...lineupForm,
                  formation: e.target.value,
                  player_ids: [],
                })
              }
            >
              {formations.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Field>
          <LineupPicker
            club={clubData}
            form={lineupForm}
            setForm={setLineupForm}
          />
          <p className="hint">
            A escalação exige 5 titulares: 1 goleiro e jogadores de linha
            conforme a formação.
          </p>
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModal("")}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                busy || lineupForm.player_ids.filter(Boolean).length !== 5
              }
            >
              Salvar escalação
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "match"}
        title="Nova partida"
        description="Escolha o mandante e o visitante. A partida usa as escalações salvas."
        onClose={() => setModal("")}
      >
        <form className="form-stack" onSubmit={playMatch}>
          <Field label="Mandante">
            <Select
              required
              value={matchForm.home_club_id}
              onChange={(e) =>
                setMatchForm({ ...matchForm, home_club_id: e.target.value })
              }
            >
              <option value="">Selecione</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visitante">
            <Select
              required
              value={matchForm.away_club_id}
              onChange={(e) =>
                setMatchForm({ ...matchForm, away_club_id: e.target.value })
              }
            >
              <option value="">Selecione</option>
              {clubs
                .filter((c) => String(c.id) !== matchForm.home_club_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <p className="hint">
            Cada clube precisa ter 5 titulares escalados. O placar e os duelos
            virão da API.
          </p>
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModal("")}
            >
              Cancelar
            </Button>
            <Button disabled={busy || !clubs.length}>Jogar partida</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "result"}
        title="Detalhes da partida"
        description={selectedMatch ? dateTime(selectedMatch.played_at) : ""}
        onClose={() => setModal("")}
      >
        {selectedMatch && <MatchResult match={selectedMatch} />}
      </Dialog>
      <Dialog
        open={modal === "success"}
        title="Ação concluída"
        onClose={() => setModal("")}
      />
    </>
  );
}
