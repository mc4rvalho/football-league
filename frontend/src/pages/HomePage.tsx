import { useEffect } from "react";
import type { Club, Match } from "../lib/types";
import { Badge, Button } from "../components/ui";
import { Icon } from "../components/Icon";

export type Section =
  "home" | "players" | "clubs" | "matches" | "match-detail" | "standings";

const steps: {
  section: Section;
  icon:
    "users" | "shield" | "shopping-cart" | "hand-coins" | "history" | "trophy";
  title: string;
  detail: string;
}[] = [
  {
    section: "players",
    icon: "users",
    title: "Jogadores",
    detail:
      "Nascem livres e Aptos. O valor de mercado vem da idade, condição e agilidade.",
  },
  {
    section: "clubs",
    icon: "shield",
    title: "Clubes",
    detail: "Começam com 300,00 moedas em caixa e sem jogadores.",
  },
  {
    section: "players",
    icon: "shopping-cart",
    title: "Compra",
    detail: "Valor, taxa, teto de 50% do caixa e contrato de fidelidade.",
  },
  {
    section: "clubs",
    icon: "hand-coins",
    title: "Venda",
    detail: "Multas antes do fim da fidelidade e comissão ficam registradas.",
  },
  {
    section: "clubs",
    icon: "history",
    title: "Histórico",
    detail: "Compras e vendas ficam registradas com valores e resultados.",
  },
  {
    section: "standings",
    icon: "trophy",
    title: "Liga",
    detail: "Escale 5 titulares, jogue partidas e acompanhe a classificação.",
  },
];

export function Home({
  clubs,
  matches,
  playerCount,
  freeCount,
  onGo,
}: {
  clubs: Club[];
  matches: Match[];
  playerCount: number;
  freeCount: number;
  onGo: (section: Section) => void;
}) {
  useEffect(() => {
    const startOnEnter = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === "Enter" &&
        target instanceof HTMLElement &&
        !target.closest("button, a, input, select, textarea")
      ) {
        event.preventDefault();
        onGo("players");
      }
    };
    window.addEventListener("keydown", startOnEnter);
    return () => window.removeEventListener("keydown", startOnEnter);
  }, [onGo]);

  return (
    <section className="welcome-page">
      <div className="welcome-field" aria-hidden="true">
        <span className="field-halfway" />
        <span className="field-circle" />
        <span className="field-box field-box-left" />
        <span className="field-box field-box-right" />
        <span className="field-goal field-goal-left" />
        <span className="field-goal field-goal-right" />
      </div>
      <div className="welcome-panel">
        <div className="welcome-top-rule" />
        <div className="welcome-content">
          <div className="welcome-logo">
            <img src="/passe-mark.svg" alt="" />
            <b>Passe</b>
          </div>
          <div className="welcome-status">
            <Badge tone="success">Liga Fictícia 2026</Badge>
            <span>·</span>
            <span>
              {matches.length
                ? `${matches.length} partidas jogadas`
                : "nenhuma partida ainda"}
            </span>
          </div>
          <h1>Gestão da liga, do mercado à classificação</h1>
          <p className="welcome-lead">
            Cadastre jogadores, monte os clubes e negocie com contrato de
            fidelidade. Depois, escale os titulares e jogue partidas com placar
            calculado pelos atributos.
          </p>
          <div className="welcome-start">
            <Button onClick={() => onGo("players")}>
              Iniciar <Icon name="chevron-right" size={14} />
            </Button>
            <span>
              ou tecle <kbd>Enter</kbd>
            </span>
          </div>
          <div className="welcome-metrics" aria-label="Resumo da liga">
            <span>
              <Icon name="users" size={13} />
              <b>{playerCount}</b> jogadores
            </span>
            <span>
              <Icon name="user-round" size={13} />
              <b>{freeCount}</b> livres
            </span>
            <span>
              <Icon name="shield" size={13} />
              <b>{clubs.length}</b> clubes
            </span>
            <span>
              <Icon name="swords" size={13} />
              <b>{matches.length}</b> partidas
            </span>
            <span>
              <Icon name="lock" size={13} />
              Não precisa de login
            </span>
          </div>
          <div className="welcome-steps">
            {steps.map((step, index) => (
              <button
                className="welcome-step"
                key={step.title}
                onClick={() => onGo(step.section)}
              >
                <span className="welcome-step-top">
                  <span className="welcome-step-icon">
                    <Icon name={step.icon} size={15} />
                  </span>
                  <small>0{index + 1}</small>
                  <Icon
                    name="chevron-right"
                    size={13}
                    className="welcome-step-arrow"
                  />
                </span>
                <b>{step.title}</b>
                <span>{step.detail}</span>
              </button>
            ))}
          </div>
          <div className="welcome-footnote">
            <Icon name="clock" size={13} /> Liga Fictícia 2026 · Horário de
            Brasília (UTC−3)
          </div>
        </div>
      </div>
    </section>
  );
}
