import { NextRequest, NextResponse } from "next/server";
import type { CandlePoint } from "@/lib/candles";
import { fetchBybitJson } from "@/lib/bybitFetch";

const BYBIT_KLINE_URL = "https://api.bybit.com/v5/market/kline";
const BINANCE_KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";
const MAX_DAYS = 14;
const PAGE_LIMIT = 1000;
const MAX_BARS = 4500;

type BybitKlineResponse = {
  retCode?: number;
  retMsg?: string;
  result?: {
    list?: string[][];
  };
};

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  ...unknown[],
];

function toBinanceInterval(interval: string): string {
  if (/^\d+$/.test(interval)) return `${interval}m`;
  return interval;
}

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

async function fetchBybitBars(
  symbol: string,
  interval: string,
  rangeStart: number,
  cursorEnd: number
): Promise<CandlePoint[]> {
  const collected: CandlePoint[] = [];
  let end = cursorEnd;
  let guard = 0;

  while (end > rangeStart && collected.length < MAX_BARS && guard < 8) {
    guard += 1;
    const url = new URL(BYBIT_KLINE_URL);
    url.searchParams.set("category", "linear");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("end", String(end));

    const json = await fetchBybitJson<BybitKlineResponse>(url.toString());
    if (json.retCode !== 0) {
      throw new Error(json.retMsg || `Bybit retCode ${json.retCode}`);
    }

    const list = json.result?.list ?? [];
    if (list.length === 0) break;

    // Bybit: newest → oldest
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

  while (end > rangeStart && collected.length < MAX_BARS && guard < 8) {
    guard += 1;
    const url = new URL(BINANCE_KLINE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", binanceInterval);
    url.searchParams.set("startTime", String(rangeStart));
    url.searchParams.set("endTime", String(end));
    url.searchParams.set("limit", String(PAGE_LIMIT));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance API 요청 실패: ${response.status}`);
    }

    const list = (await response.json()) as BinanceKlineRow[];
    if (!Array.isArray(list) || list.length === 0) break;

    // Binance: oldest → newest
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

function dedupeSort(bars: CandlePoint[]): CandlePoint[] {
  const unique = new Map<number, CandlePoint>();
  for (const bar of bars) unique.set(bar.time, bar);
  return Array.from(unique.values()).sort((a, b) => a.time - b.time);
}

/**
 * Fetch recent OHLC klines (default: 5m, last 14 days).
 * Tries Bybit first; falls back to Binance USDT-M when Bybit is blocked (e.g. Vercel 403).
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const interval = request.nextUrl.searchParams.get("interval") || "5";
  const days = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("days") || 14), 1),
    MAX_DAYS
  );
  const endParam = request.nextUrl.searchParams.get("end");

  if (!symbol || !/^[A-Z0-9]+$/.test(symbol)) {
    return NextResponse.json({ error: "유효하지 않은 symbol" }, { status: 400 });
  }

  const allowedIntervals = new Set([
    "1",
    "3",
    "5",
    "15",
    "30",
    "60",
    "120",
    "240",
    "D",
  ]);
  if (!allowedIntervals.has(interval)) {
    return NextResponse.json({ error: "지원하지 않는 interval" }, { status: 400 });
  }

  const now = Date.now();
  const rangeStart = now - days * 24 * 60 * 60 * 1000;
  let cursorEnd = endParam ? Number(endParam) : now;

  if (!Number.isFinite(cursorEnd) || cursorEnd <= 0) {
    return NextResponse.json({ error: "유효하지 않은 end" }, { status: 400 });
  }

  try {
    let source: "bybit-linear" | "binance-futures" = "bybit-linear";
    let collected: CandlePoint[] = [];

    try {
      collected = await fetchBybitBars(symbol, interval, rangeStart, cursorEnd);
    } catch (bybitError) {
      console.warn(
        "[/api/bybit-kline] Bybit 실패 → Binance 폴백",
        bybitError instanceof Error ? bybitError.message : bybitError
      );
      collected = await fetchBinanceBars(
        symbol,
        interval,
        rangeStart,
        cursorEnd
      );
      source = "binance-futures";
    }

    // Bybit returned empty (rare) — still try Binance
    if (collected.length === 0 && source === "bybit-linear") {
      try {
        collected = await fetchBinanceBars(
          symbol,
          interval,
          rangeStart,
          cursorEnd
        );
        if (collected.length > 0) source = "binance-futures";
      } catch {
        // keep empty
      }
    }

    const bars = dedupeSort(collected);

    return NextResponse.json({
      symbol,
      interval,
      days,
      count: bars.length,
      bars,
      oldestTime: bars[0]?.time ?? null,
      newestTime: bars[bars.length - 1]?.time ?? null,
      source,
    });
  } catch (error) {
    console.error("[/api/bybit-kline] 캔들 조회 실패", error);
    return NextResponse.json(
      {
        error: "캔들 조회 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
