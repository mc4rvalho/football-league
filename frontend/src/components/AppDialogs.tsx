import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, Dialog, Field, Input, Select } from "./ui";
import { api } from "../services/api";
import { LineupPicker } from "../pages/ClubsPage";
import { MatchResult } from "../pages/MatchesPage";
import { positionName } from "./formatters";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerSummary } from "./PlayerSummary";
import { ReceiptRow } from "./ReceiptRow";
import { dateTime, money } from "./formatters";
import { useAppController } from "../hooks/useAppController";
import { Icon } from "./Icon";

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
    actionError,
    setActionError,
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
  const [conditionChoice, setConditionChoice] = useState<{
    playerId: number;
    condition: string;
  } | null>(null);
  const [playerFormErrors, setPlayerFormErrors] = useState<
    Record<string, string>
  >({});
  const [clubNameError, setClubNameError] = useState("");
  const [clubAcronymError, setClubAcronymError] = useState("");
  const buyerClub = clubs.find((club) => String(club.id) === buyForm.club_id);
  const purchaseFee =
    activePlayer && activePlayer.market_value > 30
      ? Math.round(activePlayer.market_value * 0.05 * 100) / 100
      : 0;
  const purchaseTotal = (activePlayer?.market_value ?? 0) + purchaseFee;
  const maxPurchase = (buyerClub?.cash ?? 0) / 2;
  const [loyaltyDate, loyaltyTime = "15:00"] = buyForm.loyalty_until.split("T");
  const saleValue = activePlayer?.market_value ?? 0;
  const saleDays = activePlayer?.contract?.remaining_days ?? 0;
  const saleRate =
    saleDays === 0 ? 0 : saleDays <= 30 ? 5 : saleDays <= 180 ? 10 : 20;
  const salePenalty = Math.min(10, Math.round(saleValue * saleRate) / 100);
  const saleProfit = saleValue - (activePlayer?.contract?.purchase_value ?? 0);
  const saleFee =
    saleProfit > 0
      ? Math.round(
          (Math.min(saleProfit, 10) * 0.1 +
            Math.max(0, saleProfit - 10) * 0.2) *
            100,
        ) / 100
      : 0;
  const canRetryConnection = Boolean(
    actionError &&
    /network|conex[aã]o|timeout|timed out|não foi possível acessar a API/i.test(
      actionError,
    ),
  );
  const [starterId, setStarterId] = useState<number | null>(null);
  useEffect(() => {
    if ((modal !== "sell" && modal !== "condition") || !activePlayer?.club_id)
      return;
    let cancelled = false;
    void api<{ players: { id: number }[] }>(
      `/clubs/${activePlayer.club_id}/lineup`,
    )
      .then((lineup) => {
        if (!cancelled)
          setStarterId(
            lineup.players.some((player) => player.id === activePlayer.id)
              ? activePlayer.id
              : null,
          );
      })
      .catch(() => {
        if (!cancelled) setStarterId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [modal, activePlayer]);
  const nextCondition =
    conditionChoice &&
    activePlayer &&
    conditionChoice.playerId === activePlayer.id
      ? conditionChoice.condition
      : activePlayer?.condition;
  const closeActionDialog = () => {
    setActionError(null);
    setPlayerFormErrors({});
    setClubNameError("");
    setClubAcronymError("");
    setModal("");
  };
  const clearPlayerFieldError = (field: string) => {
    setPlayerFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const submitPlayerForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const name = playerForm.name.trim();
    if (name.length < 3 || name.length > 100)
      errors.name = "Use de 3 a 100 caracteres.";
    else if (/\d/.test(name)) errors.name = "O nome não pode conter números.";
    else if (name.split(/\s+/).length < 2)
      errors.name = "Informe pelo menos duas palavras.";
    if (playerForm.age < 16 || playerForm.age > 45)
      errors.age = "Use uma idade de 16 a 45 anos.";
    if (playerForm.agility < 1 || playerForm.agility > 100)
      errors.agility = "Use um valor de 1 a 100.";
    if (!editing) {
      const keys = [
        "pace",
        "shooting",
        "passing",
        "dribbling",
        "defending",
        "physical",
        "potential",
      ] as const;
      keys.forEach((key) => {
        if (playerForm[key] < 1 || playerForm[key] > 99)
          errors[key] = "Use um valor de 1 a 99.";
      });
      const sum = keys
        .slice(0, 6)
        .reduce((total, key) => total + Number(playerForm[key]), 0);
      if (sum > 480)
        errors.attributeSum =
          "A soma dos seis atributos não pode passar de 480.";
    }
    setPlayerFormErrors(errors);
    if (!Object.keys(errors).length) void savePlayer(event);
  };
  const submitClubForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clubForm.name.trim();
    const words = name.split(/\s+/).filter(Boolean);
    let nameError = "";
    let acronymError = "";
    if (name.length < 3 || name.length > 60)
      nameError = "Use de 3 a 60 caracteres.";
    else if (words.length < 2 || words.length > 5)
      nameError = "Informe de 2 a 5 palavras.";
    else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ .'-]+$/.test(name))
      nameError = "Use apenas letras, espaços, hífen, apóstrofo e ponto.";
    if (!/^[A-Z]{3}$/.test(clubForm.acronym))
      acronymError = "Informe uma sigla de 3 letras.";
    setClubNameError(nameError);
    setClubAcronymError(acronymError);
    if (!nameError && !acronymError) void saveClub(event);
  };
  return (
    <>
      <Dialog
        open={modal === "player"}
        title={editing ? "Editar jogador" : "Novo jogador"}
        description={
          editing
            ? "Edite nome, posição, idade e agilidade. Os demais dados ficam iguais."
            : "Preencha os dados e indicadores. Valor base, overall e valor de mercado são calculados ao salvar."
        }
        onClose={closeActionDialog}
        className={`player-form-dialog ${editing ? "edit-player-dialog" : "new-player-dialog"}`}
      >
        <form
          className={
            editing
              ? "form-grid edit-player-form"
              : "form-grid create-player-form"
          }
          noValidate
          onSubmit={submitPlayerForm}
        >
          {actionError && (
            <div
              className="inline-alert alert-error player-form-error"
              role="alert"
            >
              <Icon name="circle-alert" size={15} />
              <span>
                <b>
                  {editing
                    ? "Não foi possível salvar as alterações"
                    : "Não foi possível cadastrar o jogador"}
                </b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          <Field
            label="Nome"
            help="De 3 a 100 caracteres, com pelo menos duas palavras e sem números."
            className="player-name-field"
            error={playerFormErrors.name}
          >
            <Input
              required
              aria-invalid={Boolean(playerFormErrors.name)}
              minLength={3}
              maxLength={100}
              pattern="(?=.* )[^0-9]{3,100}"
              value={playerForm.name}
              onChange={(e) => {
                setActionError(null);
                clearPlayerFieldError("name");
                setPlayerForm({ ...playerForm, name: e.target.value });
              }}
              placeholder="Ex.: Meia Lua"
            />
          </Field>
          <Field label="Posição" className="player-position-field">
            <div className="position-tiles">
              {positions.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`position-tile ${playerForm.position === p ? "selected" : ""}`}
                  disabled={Boolean(editing?.club_id)}
                  onClick={() => {
                    setActionError(null);
                    setPlayerForm({ ...playerForm, position: p });
                  }}
                >
                  <b>{p}</b>
                  <small>{positionName[p]}</small>
                </button>
              ))}
            </div>
            {editing?.club_id && (
              <small className="field-help">
                Jogador com clube não muda de posição.
              </small>
            )}
          </Field>
          <Field
            label="Idade"
            className="player-age-field"
            error={playerFormErrors.age}
          >
            <Input
              required
              aria-invalid={Boolean(playerFormErrors.age)}
              type="number"
              min={16}
              max={45}
              value={playerForm.age}
              onChange={(e) => {
                setActionError(null);
                clearPlayerFieldError("age");
                setPlayerForm({ ...playerForm, age: Number(e.target.value) });
              }}
            />
          </Field>
          <Field
            label="Agilidade"
            className="player-agility-field"
            error={playerFormErrors.agility}
          >
            <Input
              required
              aria-invalid={Boolean(playerFormErrors.agility)}
              type="number"
              min={1}
              max={100}
              value={playerForm.agility}
              onChange={(e) => {
                setActionError(null);
                clearPlayerFieldError("agility");
                setPlayerForm({
                  ...playerForm,
                  agility: Number(e.target.value),
                });
              }}
            />
          </Field>
          {!editing && (
            <>
              <Field
                label="Valor base (moedas)"
                help="Calculado no cadastro."
                className="player-base-field"
              >
                <Input disabled value="Após salvar" />
              </Field>
              <section className="technical-section">
                <div>
                  <b>Indicadores técnicos</b>
                  <p>
                    Seis atributos e o potencial, de 1 a 99. A soma dos seis
                    atributos não pode passar de 480. Soma atual:{" "}
                    {[
                      playerForm.pace,
                      playerForm.shooting,
                      playerForm.passing,
                      playerForm.dribbling,
                      playerForm.defending,
                      playerForm.physical,
                    ].reduce((sum, value) => sum + Number(value), 0)}{" "}
                    / 480.
                  </p>
                  {playerFormErrors.attributeSum && (
                    <small className="field-error">
                      {playerFormErrors.attributeSum}
                    </small>
                  )}
                </div>
              </section>
              <div className="player-creation-layout">
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
                      error={playerFormErrors[k]}
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
                        aria-invalid={Boolean(playerFormErrors[k])}
                        value={playerForm[k]}
                        onChange={(e) => {
                          setActionError(null);
                          clearPlayerFieldError(k);
                          clearPlayerFieldError("attributeSum");
                          setPlayerForm({
                            ...playerForm,
                            [k]: Number(e.target.value),
                          });
                        }}
                      />
                    </Field>
                  ))}
                </div>
                <aside className="attribute-preview">
                  <b>
                    <Icon name="chart-bar" size={13} /> Prévia dos atributos
                  </b>
                  {(
                    [
                      "pace",
                      "shooting",
                      "passing",
                      "dribbling",
                      "defending",
                      "physical",
                    ] as const
                  ).map((key) => (
                    <span key={key}>
                      {
                        {
                          pace: "Velocidade",
                          shooting: "Finalização",
                          passing: "Passe",
                          dribbling: "Drible",
                          defending: "Defesa",
                          physical: "Físico",
                        }[key]
                      }
                      <i>
                        <em style={{ width: `${playerForm[key]}%` }} />
                      </i>
                      <b>{playerForm[key]}</b>
                    </span>
                  ))}
                  <small>
                    Faixa clara: até o potencial ({playerForm.potential}),
                    previsão se desenha os valores digitados.
                  </small>
                </aside>
              </div>
            </>
          )}
          <div className="dialog-actions">
            <Button variant="outline" type="button" onClick={closeActionDialog}>
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
        onClose={closeActionDialog}
        className="club-create-dialog"
      >
        <form className="form-stack" noValidate onSubmit={submitClubForm}>
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={15} />
              <span>
                <b>Não foi possível criar o clube</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          <Field
            label="Nome"
            help="De 3 a 60 caracteres, de 2 a 5 palavras; só letras, espaços, hífen e ponto. Não pode repetir outro clube."
            error={clubNameError}
          >
            <span className="club-input-icon-wrap">
              <Icon name="shield" size={14} />
              <Input
                required
                aria-invalid={Boolean(
                  clubNameError ||
                  actionError?.startsWith("Já existe um clube com o nome"),
                )}
                minLength={3}
                maxLength={60}
                pattern="[A-Za-zÀ-ÖØ-öø-ÿ .'-]{3,60}"
                value={clubForm.name}
                onChange={(e) => {
                  setActionError(null);
                  setClubNameError("");
                  setClubForm({ ...clubForm, name: e.target.value });
                }}
                placeholder="Ex.: Águias FC"
              />
            </span>
          </Field>
          <Field
            label="Sigla"
            help="3 letras de A a Z, em maiúsculas."
            error={clubAcronymError}
          >
            <span className="club-input-icon-wrap">
              <Icon name="tag" size={14} />
              <Input
                required
                aria-invalid={Boolean(
                  clubAcronymError ||
                  actionError?.startsWith("Já existe um clube com a sigla"),
                )}
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                value={clubForm.acronym}
                onChange={(e) => {
                  setActionError(null);
                  setClubAcronymError("");
                  setClubForm({
                    ...clubForm,
                    acronym: e.target.value.toUpperCase(),
                  });
                }}
                placeholder="AGU"
              />
            </span>
          </Field>
          <div className="hint club-start-cash">
            <Icon name="coins" size={13} /> O clube começa com 300,00 em caixa e
            sem jogadores.
          </div>
          <div className="dialog-actions">
            <Button variant="outline" type="button" onClick={closeActionDialog}>
              Cancelar
            </Button>
            <Button disabled={busy || clubs.length >= 20}>Criar clube</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "buy"}
        title="Comprar jogador"
        description="Escolha o clube comprador e até quando vai a fidelidade do contrato."
        onClose={closeActionDialog}
        className="buy-player-dialog"
      >
        <form className="form-stack" onSubmit={buyPlayer}>
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={15} />
              <span>
                <b>Compra recusada</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          {busy && (
            <div className="inline-alert alert-info" role="status">
              <Icon name="info" size={14} />
              <span>
                Enviando a compra. Os botões ficam desabilitados até a resposta.
              </span>
            </div>
          )}
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <Field label="Clube comprador">
            <Select
              required
              value={buyForm.club_id}
              onChange={(e) => {
                setActionError(null);
                setBuyForm({ ...buyForm, club_id: e.target.value });
              }}
            >
              <option value="">Selecione um clube</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.acronym}) · caixa {money(c.cash)}
                </option>
              ))}
            </Select>
          </Field>
          {buyerClub && (
            <small className="buy-cash-caption">
              Caixa atual: {money(buyerClub.cash)}. O custo total (
              {money(purchaseTotal)}) pode ir até 50% do caixa (
              {money(maxPurchase)}).
            </small>
          )}
          <div className="buy-loyalty-fields">
            <Field label="Fim da fidelidade">
              <Input
                type="date"
                required
                value={loyaltyDate}
                onChange={(e) => {
                  setActionError(null);
                  setBuyForm({
                    ...buyForm,
                    loyalty_until: `${e.target.value}T${loyaltyTime}`,
                  });
                }}
              />
            </Field>
            <Field label="Horário">
              <Input
                type="time"
                required
                value={loyaltyTime}
                onChange={(e) => {
                  setActionError(null);
                  setBuyForm({
                    ...buyForm,
                    loyalty_until: `${loyaltyDate}T${e.target.value}`,
                  });
                }}
              />
            </Field>
          </div>
          <small className="buy-loyalty-help">
            Depois do momento da compra até 1.095 dias. Horário de Brasília;
            enviado com o fuso (−03:00).
          </small>
          <div className="hint buy-fee-note">
            <Icon name="info" size={13} />A taxa é de 5% do valor de mercado, só
            quando ele passa de 30,00. Taxa, custo e novo caixa são calculados
            ao confirmar.
          </div>
          <div className="dialog-actions">
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={closeActionDialog}
            >
              Cancelar
            </Button>
            <Button disabled={busy || !clubs.length}>
              <Icon
                name={
                  busy || canRetryConnection ? "refresh-cw" : "shopping-cart"
                }
                size={13}
              />
              {busy
                ? "Comprando…"
                : canRetryConnection
                  ? "Tentar de novo"
                  : "Confirmar compra"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={modal === "sell"}
        title={`Vender ${activePlayer?.name ?? "jogador"}?`}
        description="O jogador sairá do elenco e ficará livre."
        onClose={closeActionDialog}
        className="sell-player-dialog"
      >
        <div className="form-stack">
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={15} />
              <span>
                <b>A venda foi recusada</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          {busy && (
            <div className="inline-alert alert-info" role="status">
              <Icon name="info" size={14} />
              <span>
                Enviando a venda. Os botões ficam desabilitados até a resposta.
              </span>
            </div>
          )}
          {starterId === activePlayer?.id && activePlayer && (
            <div className="inline-alert alert-warning" role="status">
              <Icon name="triangle-alert" size={15} />
              <span>
                <b>{activePlayer.name} é titular</b>
                <small>
                  Ao vender, ele sai da escalação; o clube só volta a jogar
                  partidas depois de escalar novos 5 titulares.
                </small>
              </span>
            </div>
          )}
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <div className="receipt-list sale-preview">
            <ReceiptRow
              label="Valor de compra"
              value={money(activePlayer?.contract?.purchase_value ?? 0)}
            />
            <ReceiptRow
              label="Fim da fidelidade"
              value={
                activePlayer?.contract?.loyalty_until
                  ? dateTime(activePlayer.contract.loyalty_until)
                  : "—"
              }
            />
            <ReceiptRow label="Dias restantes" value={saleDays} />
            <ReceiptRow label="Valor de venda agora" value={money(saleValue)} />
            <ReceiptRow
              label={`Multa (${saleRate}%)`}
              value={money(salePenalty)}
            />
            <ReceiptRow label="Comissão" value={money(saleFee)} />
            <ReceiptRow
              label="Lucro estimado"
              value={
                <span className={saleProfit >= 0 ? "positive" : "negative"}>
                  {money(saleProfit)}
                </span>
              }
              strong
            />
          </div>
          <div className="hint sell-fee-note">
            <Icon name="info" size={13} /> A venda usa o valor de mercado do
            momento. Multa (teto de 10,00), lucro, comissão e crédito são
            calculados ao confirmar.
          </div>
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={closeActionDialog}
            >
              Cancelar
            </Button>
            <Button disabled={busy} onClick={() => void sellPlayer()}>
              <Icon
                name={busy || canRetryConnection ? "refresh-cw" : "hand-coins"}
                size={14}
              />
              {busy
                ? "Vendendo…"
                : canRetryConnection
                  ? "Tentar de novo"
                  : "Confirmar venda"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={modal === "receipt"}
        title={
          receipt?.type === "COMPRA" ? "Compra concluída" : "Venda concluída"
        }
        description={
          receipt?.type === "VENDA"
            ? `${activePlayer?.name ?? "O jogador"} voltou a ficar livre e saiu da escalação.`
            : `${activePlayer?.name ?? "O jogador"} agora é do ${clubs.find((club) => club.id === receipt?.club_id)?.name ?? "clube"}.`
        }
        onClose={() => setModal("")}
      >
        {receipt && (
          <div className="form-stack">
            <div className="receipt-success-icon">
              <Icon name="circle-check" size={18} />
            </div>
            <div className="receipt-list">
              {receipt.type === "COMPRA" ? (
                <>
                  <ReceiptRow
                    label="Valor de mercado"
                    description="Valor no momento da compra"
                    value={money(receipt.value)}
                  />
                  <ReceiptRow
                    label="Taxa"
                    description={
                      receipt.fee > 0
                        ? "5% do valor, por passar de 30,00"
                        : "Sem taxa para valor de até 30,00"
                    }
                    value={money(receipt.fee)}
                  />
                  <ReceiptRow
                    label="Custo total"
                    description="Valor de mercado + taxa"
                    value={money(receipt.value + receipt.fee)}
                    strong
                  />
                  <ReceiptRow
                    label="Fim da fidelidade"
                    description="Horário de Brasília (UTC−3)"
                    value={
                      receipt.contract?.loyalty_until
                        ? dateTime(receipt.contract.loyalty_until)
                        : "—"
                    }
                  />
                  <ReceiptRow
                    label="Contrato"
                    value={
                      <span className="receipt-status active">
                        {receipt.contract?.status ?? "ATIVO"}
                      </span>
                    }
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
                    value={
                      <span
                        className={`receipt-status ${receipt.contract_status === "RESCINDIDO" ? "cancelled" : "closed"}`}
                      >
                        {receipt.contract_status ?? "ENCERRADO"}
                      </span>
                    }
                  />
                </>
              )}
              <ReceiptRow
                label={`Novo caixa do ${clubs.find((club) => club.id === receipt.club_id)?.name ?? "clube"}`}
                description="Saldo atualizado após a operação"
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
                    setClubTab(receipt.type === "VENDA" ? "history" : "roster");
                    nav("clubs");
                  } else setModal("");
                }}
              >
                {receipt.type === "VENDA" ? "Ver histórico" : "Ver clube"}
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
        onClose={closeActionDialog}
        className="delete-player-dialog"
      >
        <div className="form-stack">
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={14} />
              <span>
                <b>Não foi possível excluir o jogador</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          {activePlayer && <PlayerSummary player={activePlayer} />}
          <p>
            Este jogador sai da lista e da busca, mas as transações e partidas
            antigas continuam como foram gravadas.
          </p>
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
        description="A condição muda o desconto do valor de mercado, recalculado ao salvar."
        onClose={closeActionDialog}
        className="condition-dialog"
      >
        <div className="form-stack">
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={14} />
              <span>
                <b>Não foi possível alterar a condição</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          {activePlayer && <PlayerSummary player={activePlayer} />}
          {starterId === activePlayer?.id &&
            nextCondition === "DOENTE" &&
            activePlayer && (
              <div className="inline-alert alert-warning" role="status">
                <Icon name="triangle-alert" size={15} />
                <span>
                  <b>{activePlayer.name} é titular</b>
                  <small>
                    Ao passar a Doente, ele sai da escalação, e o clube só volta
                    a jogar partidas depois de escalar de novo os 5 titulares.
                  </small>
                </span>
              </div>
            )}
          <div
            className="condition-choices"
            role="radiogroup"
            aria-label="Nova condição"
          >
            {(
              [
                ["APTO", "Apto", "Sem desconto por condição."],
                [
                  "MAL_CONDICIONADO",
                  "Mal condicionado",
                  "Desconto de 15%. A agilidade também ajusta o valor.",
                ],
                [
                  "DOENTE",
                  "Doente",
                  "Desconto de 30%. A agilidade também ajusta o valor.",
                ],
              ] as const
            ).map(([value, label, help]) => {
              const disabled =
                activePlayer?.condition === "DOENTE" && value === "APTO";
              return (
                <label
                  className={`condition-choice ${nextCondition === value ? "selected" : ""} ${disabled ? "disabled" : ""}`}
                  key={value}
                >
                  <input
                    type="radio"
                    name="new-condition"
                    value={value}
                    checked={nextCondition === value}
                    disabled={disabled}
                    onChange={() =>
                      activePlayer &&
                      setConditionChoice({
                        playerId: activePlayer.id,
                        condition: value,
                      })
                    }
                  />
                  <span>
                    <b>{label}</b>
                    {activePlayer?.condition === value && (
                      <small className="condition-current">Atual</small>
                    )}
                    <small>
                      {disabled ? "Doente não passa direto para Apto." : help}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setModal("")}>
              Cancelar
            </Button>
            <Button
              disabled={busy || nextCondition === activePlayer?.condition}
              onClick={() => {
                if (activePlayer)
                  void run(
                    () =>
                      api(`/players/${activePlayer.id}/condition`, {
                        method: "PATCH",
                        body: JSON.stringify({ condition: nextCondition }),
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
        className="player-details-dialog"
      >
        {activePlayer && (
          <PlayerDetails
            player={activePlayer}
            clubName={
              clubs.find((club) => club.id === activePlayer.club_id)?.name
            }
          />
        )}
      </Dialog>
      <Dialog
        open={modal === "created-player"}
        title="Jogador cadastrado"
        description={`${activePlayer?.name ?? "O jogador"} entrou livre e Apto. Valores em moedas, calculados pela API ao salvar.`}
        onClose={() => setModal("")}
        className="player-created-dialog"
      >
        {activePlayer && (
          <div className="form-stack">
            <div className="receipt-success-icon">
              <Icon name="circle-check" size={18} />
            </div>
            <div className="receipt-list">
              <ReceiptRow
                label="Valor base"
                description="Calculado no cadastro; não muda depois"
                value={money(activePlayer.base_value)}
              />
              <ReceiptRow
                label="Valor de mercado"
                description="Com condição, agilidade e idade"
                value={money(activePlayer.market_value)}
              />
              <ReceiptRow
                label="Overall"
                description={`Pelos pesos da posição ${positionName[activePlayer.position]}`}
                value={activePlayer.overall}
                strong
              />
            </div>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setModal("details")}>
                Ver detalhes
              </Button>
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
            <Button variant="outline" type="button" onClick={closeActionDialog}>
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
        description="Escolha o mandante e o visitante. O placar sai dos atributos dos titulares, sem sorteio."
        onClose={() => setModal("")}
      >
        <form className="form-stack" onSubmit={playMatch}>
          {actionError && (
            <div className="inline-alert alert-error" role="alert">
              <Icon name="circle-alert" size={14} />
              <span>
                <b>Não foi possível jogar a partida</b>
                <small>{actionError}</small>
              </span>
            </div>
          )}
          <Field label="Mandante">
            <div className="match-select-control">
              <Icon name="shield" size={13} />
              <Select
                required
                className={
                  actionError &&
                  clubs.find(
                    (club) =>
                      String(club.id) === matchForm.home_club_id &&
                      actionError.includes(club.name),
                  )
                    ? "match-invalid-select"
                    : undefined
                }
                aria-invalid={Boolean(
                  actionError &&
                  clubs.find(
                    (club) =>
                      String(club.id) === matchForm.home_club_id &&
                      actionError.includes(club.name),
                  ),
                )}
                value={matchForm.home_club_id}
                onChange={(e) => {
                  setActionError(null);
                  setMatchForm({ ...matchForm, home_club_id: e.target.value });
                }}
              >
                <option value="">Selecione</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <small className="muted match-field-help">
              Faz os 3 primeiros ataques.
            </small>
          </Field>
          <Field label="Visitante">
            <div className="match-select-control">
              <Icon name="shield" size={13} />
              <Select
                required
                className={
                  actionError &&
                  clubs.find(
                    (club) =>
                      String(club.id) === matchForm.away_club_id &&
                      actionError.includes(club.name),
                  )
                    ? "match-invalid-select"
                    : undefined
                }
                aria-invalid={Boolean(
                  actionError &&
                  clubs.find(
                    (club) =>
                      String(club.id) === matchForm.away_club_id &&
                      actionError.includes(club.name),
                  ),
                )}
                value={matchForm.away_club_id}
                onChange={(e) => {
                  setActionError(null);
                  setMatchForm({ ...matchForm, away_club_id: e.target.value });
                }}
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
            </div>
            <small className="muted match-field-help">
              Precisa ser um clube diferente do mandante.
            </small>
          </Field>
          <div className="hint match-rules">
            <b>
              <Icon name="info" size={13} /> Como sai o placar
            </b>
            <p>
              Cada time faz 3 ataques. Pela ordem do elenco, os jogadores de
              linha vão do 1º (o mais recuado) ao 4º (o mais avançado): o 4º
              enfrenta o goleiro, o 3º o 1º defensor e o 2º o 2º defensor. O
              atacante usa finalização (ATA), passe (MEI) ou drible (ZAG e LAT),
              e quem defende usa defesa. É gol só quando o ataque é maior; mal
              condicionado joga com 15% a menos.
            </p>
            <p>
              Os dois clubes precisam ter 5 titulares escalados. A partida não
              mexe no caixa.
            </p>
          </div>
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
                busy ||
                clubs.length < 2 ||
                !matchForm.home_club_id ||
                !matchForm.away_club_id ||
                matchForm.home_club_id === matchForm.away_club_id
              }
            >
              Jogar partida
            </Button>
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
