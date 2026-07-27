/** OHLC candle in USDT (or KRW after FX conversion) */
export type CandlePoint = {
  /** Unix seconds — candle open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** App chart intervals (Bybit-style codes) */
export type ChartInterval = "5" | "D" | "M";

export const CHART_INTERVALS: readonly {
  id: ChartInterval;
  label: string;
}[] = [
  { id: "5", label: "5분봉" },
  { id: "D", label: "일봉" },
  { id: "M", label: "월봉" },
] as const;

export const CANDLE_INTERVAL_SEC = 5 * 60;
export const MAX_CANDLES = 5000;

export function candleOpenTime(
  unixSec: number,
  intervalSec = CANDLE_INTERVAL_SEC
): number {
  return Math.floor(unixSec / intervalSec) * intervalSec;
}

/** Bucket open time for 5m / day / month (UTC) */
export function bucketOpenTime(
  unixSec: number,
  interval: ChartInterval
): number {
  if (interval === "5") return candleOpenTime(unixSec, CANDLE_INTERVAL_SEC);

  const d = new Date(unixSec * 1000);
  if (interval === "D") {
    return Math.floor(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
    );
  }
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000
  );
}

export function historyDaysForInterval(interval: ChartInterval): number {
  if (interval === "5") return 14;
  if (interval === "D") return 365;
  return 365 * 5;
}

export function isValidCandle(c: CandlePoint): boolean {
  return (
    Number.isFinite(c.time) &&
    c.time > 0 &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close) &&
    c.open > 0 &&
    c.high > 0 &&
    c.low > 0 &&
    c.close > 0
  );
}

/** Merge by candle open time — incoming overwrites same bucket */
export function mergeCandles(
  existing: CandlePoint[],
  incoming: CandlePoint[]
): CandlePoint[] {
  const map = new Map<number, CandlePoint>();
  for (const c of existing) {
    if (isValidCandle(c)) map.set(c.time, c);
  }
  for (const c of incoming) {
    if (isValidCandle(c)) map.set(c.time, c);
  }

  const merged = Array.from(map.values()).sort((a, b) => a.time - b.time);
  return merged.length > MAX_CANDLES ? merged.slice(-MAX_CANDLES) : merged;
}

/** Apply live trade into the current candle bucket */
export function applyTickToCandles(
  candles: CandlePoint[],
  usdtPrice: number,
  nowSec = Math.floor(Date.now() / 1000),
  interval: ChartInterval = "5"
): CandlePoint[] {
  if (!Number.isFinite(usdtPrice) || usdtPrice <= 0) return candles;

  const bucket = bucketOpenTime(nowSec, interval);
  const last = candles[candles.length - 1];

  if (last && last.time === bucket) {
    const updated: CandlePoint = {
      time: bucket,
      open: last.open,
      high: Math.max(last.high, usdtPrice),
      low: Math.min(last.low, usdtPrice),
      close: usdtPrice,
    };
    return [...candles.slice(0, -1), updated].slice(-MAX_CANDLES);
  }

  const opened: CandlePoint = {
    time: bucket,
    open: usdtPrice,
    high: usdtPrice,
    low: usdtPrice,
    close: usdtPrice,
  };
  return [...candles, opened].slice(-MAX_CANDLES);
}

export function scaleCandles(
  candles: CandlePoint[],
  rate: number
): CandlePoint[] {
  if (!rate || rate <= 0) return [];
  return candles.map((c) => ({
    time: c.time,
    open: c.open * rate,
    high: c.high * rate,
    low: c.low * rate,
    close: c.close * rate,
  }));
}
