export interface HistoryPoint {
  day: string;
  units: number;
}

export interface ForecastPoint {
  day: string;
  units: number | null;
  predicted: number | null;
}

export interface ForecastResult {
  series: ForecastPoint[];
  predictedTotal: number;
  dailyAverage: number;
  trend: "rising" | "flat" | "falling";
  recommendedRestock: number;
  confidence: "low" | "medium" | "high";
  historyDays: number;
}

/**
 * Damped linear-trend forecast with a 7-day moving-average level.
 * Runs entirely server-side over historical sales rows.
 */
export function forecastDemand(
  history: HistoryPoint[],
  horizonDays: number,
  currentStock: number,
): ForecastResult {
  const units = history.map((h) => h.units);
  const n = units.length;
  const recent = units.slice(-28);
  const level =
    recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;

  // least-squares slope over the trailing window
  let slope = 0;
  if (recent.length >= 7) {
    const meanX = (recent.length - 1) / 2;
    const meanY = level;
    let num = 0;
    let den = 0;
    recent.forEach((y, i) => {
      num += (i - meanX) * (y - meanY);
      den += (i - meanX) ** 2;
    });
    slope = den === 0 ? 0 : num / den;
  }

  const damping = 0.85;
  const series: ForecastPoint[] = history.map((h) => ({
    day: h.day,
    units: h.units,
    predicted: null,
  }));

  const lastDay = history.length > 0 ? new Date(history[history.length - 1]!.day) : new Date();
  let predictedTotal = 0;
  let step = 0;
  for (let i = 1; i <= horizonDays; i += 1) {
    step += damping ** i;
    const value = Math.max(0, level + slope * step);
    predictedTotal += value;
    const date = new Date(lastDay);
    date.setDate(date.getDate() + i);
    series.push({
      day: date.toISOString().slice(0, 10),
      units: null,
      predicted: Math.round(value * 100) / 100,
    });
  }

  const rounded = Math.ceil(predictedTotal);
  const safetyStock = Math.ceil(rounded * 0.2);
  const trend: ForecastResult["trend"] = slope > 0.05 ? "rising" : slope < -0.05 ? "falling" : "flat";

  return {
    series,
    predictedTotal: rounded,
    dailyAverage: Math.round((predictedTotal / horizonDays) * 100) / 100,
    trend,
    recommendedRestock: Math.max(0, rounded + safetyStock - currentStock),
    confidence: n >= 60 ? "high" : n >= 21 ? "medium" : "low",
    historyDays: n,
  };
}
