import type { CandlePoint } from "@/lib/candles";

const BINANCE_KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";
const BYBIT_KLINE_URL = "https://api.bybit.com/v5/market/kline";
const PAGE_LIMIT = 1500;
const MAX_BARS = 5000;
const MAX_DAYS = 365 * 10;

function toBinanceInterval(interval: string): string {
  if (interval === "D") return "1d";
  if (interval === "M") return "1M";
  if (/^\d+$/.test(interval)) return `${interval}m`;
  return interval;
}

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  ...unknown[],
];

type BybitKlineResponse = {
  retCode?: number;
  result?: { list?: string[][] };
};

function parseCandle(
  startMs: number,
  open: number,
  high: number,
  low: number,
  close: number
): CandlePoint | null {
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(open) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close) ||
    open <= 0 ||
    high <= 0 ||
    low <= 0 ||
    close <= 0
  ) {
    return null;
  }
  return {
    time: Math.floor(startMs / 1000),
    open,
    high,
    low,
    close,
  };
}

function dedupeSort(bars: CandlePoint[]): CandlePoint[] {
  const map = new Map<number, CandlePoint>();
  for (const bar of bars) map.set(bar.time, bar);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

async function fetchBinanceBars(
  symbol: string,
  interval: string,
  rangeStart: number,
  cursorEnd: number
): Promise<CandlePoint[]> {
  const collected: CandlePoint[] = [];
  let end = cursorEnd;
  let guard = 0;
  const binanceInterval = toBinanceInterval(interval);

  while (end > rangeStart && collected.length < MAX_BARS && guard < 20) {
    guard += 1;
    const url = new URL(BINANCE_KLINE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", binanceInterval);
    url.searchParams.set("startTime", String(rangeStart));
    url.searchParams.set("endTime", String(end));
    url.searchParams.set("limit", String(PAGE_LIMIT));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Binance ${res.status}`);

    const list = (await res.json()) as BinanceKlineRow[];
    if (!Array.isArray(list) || list.length === 0) break;

    for (const row of list) {
      const candle = parseCandle(
        Number(row[0]),
        Number(row[1]),
        Number(row[2]),
        Number(row[3]),
        Number(row[4])
      );
      if (!candle) continue;
      if (candle.time * 1000 < rangeStart) continue;
      collected.push(candle);
    }

    const oldestMs = Number(list[0]?.[0]);
    if (!Number.isFinite(oldestMs) || oldestMs <= rangeStart) break;
    end = oldestMs - 1;
    if (list.length < PAGE_LIMIT) break;
  }

  return collected;
}

async function fetchBybitBars(
  symbol: string,
  interval: string,
  rangeStart: number,
  cursorEnd: number
): Promise<CandlePoint[]> {
  const collected: CandlePoint[] = [];
  let end = cursorEnd;
  let guard = 0;

  while (end > rangeStart && collected.length < MAX_BARS && guard < 20) {
    guard += 1;
    const url = new URL(BYBIT_KLINE_URL);
    url.searchParams.set("category", "linear");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("end", String(end));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Bybit ${res.status}`);

    const json = (await res.json()) as BybitKlineResponse;
    if (json.retCode !== 0) throw new Error("Bybit retCode");

    const list = json.result?.list ?? [];
    if (list.length === 0) break;

    for (const row of list) {
      const candle = parseCandle(
        Number(row[0]),
        Number(row[1]),
        Number(row[2]),
        Number(row[3]),
        Number(row[4])
      );
      if (!candle) continue;
      if (candle.time * 1000 < rangeStart) continue;
      collected.push(candle);
    }

    const oldestMs = Number(list[list.length - 1]?.[0]);
    if (!Number.isFinite(oldestMs) || oldestMs <= rangeStart) break;
    end = oldestMs - 1;
    if (list.length < PAGE_LIMIT) break;
  }

  return collected;
}

async function fetchViaApiRoute(
  symbol: string,
  interval: string,
  days: number,
  endMs?: number
): Promise<CandlePoint[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    days: String(days),
  });
  if (endMs) params.set("end", String(endMs));

  const res = await fetch(`/api/bybit-kline?${params.toString()}`);
  const data = (await res.json()) as { bars?: CandlePoint[]; error?: string };
  if (!res.ok) throw new Error(data.error || "API route failed");
  return data.bars ?? [];
}

export type FetchKlinesOptions = {
  symbol: string;
  interval?: string;
  days?: number;
  endMs?: number;
};

/**
 * Load OHLC history from the browser (avoids Vercel IP blocks).
 * Prefer Bybit (same as live ticker) → Binance → same-origin API route.
 */
export async function fetchKlinesClient(
  options: FetchKlinesOptions
): Promise<CandlePoint[]> {
  const symbol = options.symbol.toUpperCase();
  const interval = options.interval || "5";
  const days = Math.min(Math.max(options.days ?? 14, 1), MAX_DAYS);
  const now = Date.now();
  const rangeStart = now - days * 24 * 60 * 60 * 1000;
  const cursorEnd = options.endMs ?? now;

  const attempts = [
    () => fetchBybitBars(symbol, interval, rangeStart, cursorEnd),
    () => fetchBinanceBars(symbol, interval, rangeStart, cursorEnd),
    () => fetchViaApiRoute(symbol, interval, days, options.endMs),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const bars = dedupeSort(await attempt());
      if (bars.length > 0) return bars;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("캔들 히스토리 조회 실패");
}

const STORAGE_PREFIX = "sk-tracker-klines-v2:";

/** Drop cache if the newest bar is older than this (seconds) */
const CACHE_MAX_AGE_SEC: Record<string, number> = {
  "5": 15 * 60,
  D: 3 * 24 * 60 * 60,
  M: 45 * 24 * 60 * 60,
};

function cacheKey(symbol: string, interval: string): string {
  return `${STORAGE_PREFIX}${symbol.toUpperCase()}:${interval}`;
}

export function loadCachedKlines(
  symbol: string,
  interval = "5"
): CandlePoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(cacheKey(symbol, interval));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CandlePoint[];
    if (!Array.isArray(parsed)) return [];
    const bars = dedupeSort(parsed).slice(-MAX_BARS);
    const last = bars[bars.length - 1];
    if (!last) return [];
    const maxAge = CACHE_MAX_AGE_SEC[interval] ?? CACHE_MAX_AGE_SEC["5"];
    const ageSec = Math.floor(Date.now() / 1000) - last.time;
    if (ageSec > maxAge) {
      sessionStorage.removeItem(cacheKey(symbol, interval));
      return [];
    }
    return bars;
  } catch {
    return [];
  }
}

export function saveCachedKlines(
  symbol: string,
  bars: CandlePoint[],
  interval = "5"
): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = dedupeSort(bars).slice(-MAX_BARS);
    sessionStorage.setItem(
      cacheKey(symbol, interval),
      JSON.stringify(trimmed)
    );
  } catch {
    // quota / private mode
  }
}
