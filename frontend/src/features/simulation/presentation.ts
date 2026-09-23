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
