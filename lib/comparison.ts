import type { CandlePoint } from "@/lib/candles";

export type CompareSeriesId = "hynix_kospi" | "hynix_adr" | "micron";

export type CompareSeriesMeta = {
  id: CompareSeriesId;
  name: string;
  shortName: string;
  bybitTicker: string;
  color: string;
};

/** Bybit linear perps — best 24h realtime for all three */
export const COMPARE_SERIES: readonly CompareSeriesMeta[] = [
  {
    id: "hynix_kospi",
    name: "하이닉스 본주",
    shortName: "본주",
    bybitTicker: "SKHYNIXUSDT",
    color: "#fca5a5", // 옅은 빨강
  },
  {
    id: "hynix_adr",
    name: "하이닉스 ADR",
    shortName: "ADR",
    bybitTicker: "SKHYUSDT",
    color: "#22d3ee", // 시안 — 빨강과 최대 대비
  },
  {
    id: "micron",
    name: "마이크론",
    shortName: "MU",
    bybitTicker: "MUUSDT",
    color: "#facc15", // 노랑 — 빨강·시안과 삼원색 대비
  },
] as const;

/** Chart window: recent moves only so slopes stay readable */
export const COMPARE_LOOKBACK_SEC = 24 * 60 * 60;
/** Short slope window (~15m of 5m bars) */
export const SLOPE_LOOKBACK_BARS = 3;
/** Medium slope window (~1h) */
export const SLOPE_HOUR_BARS = 12;

export type IndexedPoint = {
  time: number;
  values: Partial<Record<CompareSeriesId, number>>;
};

export type SeriesMove = {
  /** % from window start (0% = same starting line) */
  fromBase: number | null;
  /** Recent slope % (~15m) */
  slope15m: number | null;
  /** Hourly slope % */
  slope1h: number | null;
};

/**
 * Normalize each series to % change from a shared recent base time.
 * Absolute prices are ignored — only relative rise/fall slopes matter.
 */
export function buildIndexedSeries(
  histories: Record<CompareSeriesId, CandlePoint[]>,
  lookbackSec = COMPARE_LOOKBACK_SEC
): IndexedPoint[] {
  const closes = new Map<CompareSeriesId, Map<number, number>>();

  for (const meta of COMPARE_SERIES) {
    const map = new Map<number, number>();
    for (const candle of histories[meta.id] ?? []) {
      if (candle.close > 0) map.set(candle.time, candle.close);
    }
    closes.set(meta.id, map);
  }

  const timeSet = new Set<number>();
  for (const map of closes.values()) {
    for (const t of map.keys()) timeSet.add(t);
  }
  let times = Array.from(timeSet).sort((a, b) => a - b);
  if (times.length === 0) return [];

  const cutoff = times[times.length - 1]! - lookbackSec;
  times = times.filter((t) => t >= cutoff);
  if (times.length === 0) return [];

  const bases: Partial<Record<CompareSeriesId, number>> = {};
  for (const t of times) {
    let ok = true;
    const snapshot: Partial<Record<CompareSeriesId, number>> = {};
    for (const meta of COMPARE_SERIES) {
      const price = closes.get(meta.id)?.get(t);
      if (!price) {
        ok = false;
        break;
      }
      snapshot[meta.id] = price;
    }
    if (ok) {
      Object.assign(bases, snapshot);
      break;
    }
  }

  if (Object.keys(bases).length === 0) {
    for (const meta of COMPARE_SERIES) {
      for (const t of times) {
        const price = closes.get(meta.id)?.get(t);
        if (price) {
          bases[meta.id] = price;
          break;
        }
      }
    }
  }

  const lastSeen: Partial<Record<CompareSeriesId, number>> = {};
  const points: IndexedPoint[] = [];

  for (const t of times) {
    const values: Partial<Record<CompareSeriesId, number>> = {};
    for (const meta of COMPARE_SERIES) {
      const raw = closes.get(meta.id)?.get(t);
      if (raw != null) lastSeen[meta.id] = raw;
      const price = lastSeen[meta.id];
      const base = bases[meta.id];
      if (price != null && base != null && base > 0) {
        values[meta.id] = (price / base - 1) * 100;
      }
    }
    if (Object.keys(values).length > 0) {
      points.push({ time: t, values });
    }
  }

  return points;
}

export function latestIndexed(
  points: IndexedPoint[]
): Partial<Record<CompareSeriesId, number>> {
  return points[points.length - 1]?.values ?? {};
}

export function slopeOverBars(
  points: IndexedPoint[],
  id: CompareSeriesId,
  bars: number
): number | null {
  if (points.length < 2 || bars < 1) return null;
  const end = points[points.length - 1];
  const endVal = end?.values[id];
  if (endVal == null) return null;

  const startIdx = Math.max(0, points.length - 1 - bars);
  const startVal = points[startIdx]?.values[id];
  if (startVal == null) return null;
  return endVal - startVal;
}

export function buildSeriesMoves(
  points: IndexedPoint[]
): Record<CompareSeriesId, SeriesMove> {
  const latest = latestIndexed(points);
  const result = {} as Record<CompareSeriesId, SeriesMove>;
  for (const meta of COMPARE_SERIES) {
    result[meta.id] = {
      fromBase: latest[meta.id] ?? null,
      slope15m: slopeOverBars(points, meta.id, SLOPE_LOOKBACK_BARS),
      slope1h: slopeOverBars(points, meta.id, SLOPE_HOUR_BARS),
    };
  }
  return result;
}

export function spread(
  indexed: Partial<Record<CompareSeriesId, number>>,
  a: CompareSeriesId,
  b: CompareSeriesId
): number | null {
  const left = indexed[a];
  const right = indexed[b];
  if (left == null || right == null) return null;
  return left - right;
}

export function slopeLabel(slope: number | null): string {
  if (slope == null) return "대기";
  const abs = Math.abs(slope);
  if (abs < 0.15) return "횡보";
  if (slope > 0) return abs >= 0.8 ? "급등" : "상승";
  return abs >= 0.8 ? "급락" : "하락";
}
