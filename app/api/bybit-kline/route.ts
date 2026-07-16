import { NextRequest, NextResponse } from "next/server";
import type { CandlePoint } from "@/lib/candles";

const BYBIT_KLINE_URL = "https://api.bybit.com/v5/market/kline";
const MAX_DAYS = 14;
const PAGE_LIMIT = 1000;
const MAX_BARS = 4500;

/**
 * Fetch recent Bybit linear OHLC klines (default: 5m, last 14 days).
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

  const allowedIntervals = new Set(["1", "3", "5", "15", "30", "60"]);
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
    const collected: CandlePoint[] = [];
    let guard = 0;

    while (cursorEnd > rangeStart && collected.length < MAX_BARS && guard < 8) {
      guard += 1;
      const url = new URL(BYBIT_KLINE_URL);
      url.searchParams.set("category", "linear");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("interval", interval);
      url.searchParams.set("start", String(rangeStart));
      url.searchParams.set("end", String(cursorEnd));
      url.searchParams.set("limit", String(PAGE_LIMIT));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        console.error("[/api/bybit-kline] Bybit HTTP 오류", res.status, symbol);
        return NextResponse.json(
          { error: "Bybit 캔들 조회 실패", status: res.status },
          { status: 502 }
        );
      }

      const json = (await res.json()) as {
        retCode?: number;
        retMsg?: string;
        result?: { list?: string[][] };
      };

      if (json.retCode !== 0) {
        console.error("[/api/bybit-kline] Bybit retCode", json);
        return NextResponse.json(
          { error: json.retMsg || "Bybit 캔들 조회 실패" },
          { status: 502 }
        );
      }

      const list = json.result?.list ?? [];
      if (list.length === 0) break;

      // [start, open, high, low, close, volume, turnover] — newest → oldest
      for (const row of list) {
        const startMs = Number(row[0]);
        const open = Number(row[1]);
        const high = Number(row[2]);
        const low = Number(row[3]);
        const close = Number(row[4]);
        if (
          !Number.isFinite(startMs) ||
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          continue;
        }
        collected.push({
          time: Math.floor(startMs / 1000),
          open,
          high,
          low,
          close,
        });
      }

      const oldestMs = Number(list[list.length - 1]?.[0]);
      if (!Number.isFinite(oldestMs) || oldestMs <= rangeStart) break;
      cursorEnd = oldestMs - 1;
      if (list.length < PAGE_LIMIT) break;
    }

    const unique = new Map<number, CandlePoint>();
    for (const bar of collected) {
      unique.set(bar.time, bar);
    }

    const bars = Array.from(unique.values()).sort((a, b) => a.time - b.time);

    return NextResponse.json({
      symbol,
      interval,
      days,
      count: bars.length,
      bars,
      oldestTime: bars[0]?.time ?? null,
      newestTime: bars[bars.length - 1]?.time ?? null,
    });
  } catch (error) {
    console.error("[/api/bybit-kline] 조회 실패", error);
    return NextResponse.json(
      {
        error: "Bybit 캔들 조회 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
