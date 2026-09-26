import type { SimulationDetail, SimulationObligation } from "./types";

export function formatSimulationMoney(amount: string): string {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "R0.00";
  }

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatSimulationPercentage(fraction: string): string {
  const value = Number(fraction);

  if (!Number.isFinite(value)) {
    return "0%";
  }

  return new Intl.NumberFormat("en-ZA", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * A bill can be paid in full early or on its due day while the server allows
 * payment; once the due day has passed it is missed and cannot be paid.
 */
export function canPaySimulationObligation(
  simulation: SimulationDetail,
  obligation: SimulationObligation,
): boolean {
  return (
    simulation.allowedActions.includes("PAY_OBLIGATION") &&
    (obligation.status === "SCHEDULED" || obligation.status === "PAYABLE") &&
    obligation.dueDay >= simulation.session.currentDay
  );
}

/** Board money without trailing cents, such as "R 4 940" or "R 4 940,50". */
export function formatCompactMoney(amount: string): string {
  const value = Number(amount);

  return `R ${(Number.isFinite(value) ? value : 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPoints(points: string): string {
  const value = Number(points);

  return (Number.isFinite(value) ? value : 0).toLocaleString("en-ZA", {
    maximumFractionDigits: 2,
  });
}

/** "Day 08 of 30", matching the board's zero-padded day label. */
export function formatSimulationDay(day: number, daysInMonth: number): string {
  return `Day ${String(day).padStart(2, "0")} of ${daysInMonth}`;
}
