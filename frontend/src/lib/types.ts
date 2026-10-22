export type Condition = "APTO" | "MAL_CONDICIONADO" | "DOENTE";
export type Position = "GOL" | "ZAG" | "LAT" | "MEI" | "ATA";
export type Player = {
  id: number;
  name: string;
  position: Position;
  agility: number;
  age: number;
  condition: Condition;
  base_value: number;
  market_value: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  potential: number;
  overall: number;
  club_id: number | null;
  club_name?: string | null;
  contract?: {
    loyalty_until: string;
    remaining_days: number;
    penalty_rate: number;
    purchase_value: number;
  };
};
export type Club = {
  id: number;
  name: string;
  acronym: string;
  cash: number;
  squad_value: number;
  net_worth: number;
  players?: Player[];
  formation?: string | null;
};
export type Page<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
};
export type Transaction = {
  id: number;
  created_at: string;
  type: "COMPRA" | "VENDA";
  player_id: number;
  player_name: string;
  value: number;
  fee: number;
  penalty: number;
  profit: number | null;
  cash_change: number;
};
export type TransactionHistory = {
  data: Transaction[];
  summary: {
    total_spent: number;
    total_received: number;
    total_fees: number;
    total_penalties: number;
    total_profit: number;
  };
};
export type TransactionReceipt = {
  id: number;
  type: "COMPRA" | "VENDA";
  value: number;
  fee: number;
  penalty: number;
  profit: number | null;
  cash_change: number;
  club_cash: number;
  purchase_value?: number;
  remaining_days?: number;
  penalty_rate?: number;
  contract_status?: string;
  contract?: { purchase_value: number; loyalty_until: string; status: string };
};
export type Standing = {
  position: number;
  club_id: number;
  club_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};
export type Match = {
  id: number;
  played_at: string;
  home: {
    club_id: number;
    club_name: string;
    formation: string;
    goals: number;
  };
  away: {
    club_id: number;
    club_name: string;
    formation: string;
    goals: number;
  };
  result: string;
  duels?: Duel[];
};
export type Duel = {
  order: number;
  attacking_club_id: number;
  attacker: {
    player_id: number;
    player_name: string;
    position: Position;
    condition: Condition;
    attribute: string;
    value: number;
  };
  defender: {
    player_id: number;
    player_name: string;
    position: Position;
    condition: Condition;
    attribute: string;
    value: number;
  };
  goal: boolean;
};
export type Lineup = {
  club_id: number;
  formation: string | null;
  complete: boolean;
  players: Player[];
};
