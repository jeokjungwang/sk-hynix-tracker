/** OHLC candle in USDT (or KRW after FX conversion) */
export type CandlePoint = {
  /** Unix seconds — candle open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const CANDLE_INTERVAL_SEC = 5 * 60; // 5-minute candles
export const MAX_CANDLES = 5000;

export function candleOpenTime(
  unixSec: number,
  intervalSec = CANDLE_INTERVAL_SEC
): number {
  return Math.floor(unixSec / intervalSec) * intervalSec;
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

/** Apply live trade into the current 5m candle bucket */
export function applyTickToCandles(
  candles: CandlePoint[],
  usdtPrice: number,
  nowSec = Math.floor(Date.now() / 1000)
): CandlePoint[] {
  if (!Number.isFinite(usdtPrice) || usdtPrice <= 0) return candles;

  const bucket = candleOpenTime(nowSec);
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
