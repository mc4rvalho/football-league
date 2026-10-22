export type PlayerCondition = 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE';

export function calculateMarketValue(
  baseValue: number,
  condition: PlayerCondition,
  agility: number,
  age: number,
): number {
  let conditionDiscount =
    condition === 'MAL_CONDICIONADO' ? 15 : condition === 'DOENTE' ? 30 : 0;

  if (condition !== 'APTO') {
    if (agility >= 80) conditionDiscount /= 2;
    else if (agility <= 30) conditionDiscount += 10;
  }

  const ageAdjustment = age <= 21 ? 10 : age >= 32 ? -10 : 0;
  const totalAdjustment = Math.max(-40, ageAdjustment - conditionDiscount);
  const roundedValue =
    Math.round(
      ((baseValue * (100 + totalAdjustment)) / 100 + Number.EPSILON) * 100,
    ) / 100;

  return Math.max(1, roundedValue);
}
