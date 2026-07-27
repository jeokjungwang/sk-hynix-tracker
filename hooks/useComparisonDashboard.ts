"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyTickToCandles,
  mergeCandles,
  type CandlePoint,
} from "@/lib/candles";
import { fetchBybitJson } from "@/lib/bybitFetch";
import {
  buildIndexedSeries,
  buildSeriesMoves,
  COMPARE_SERIES,
  latestIndexed,
  spread,
  type CompareSeriesId,
  type IndexedPoint,
  type SeriesMove,
} from "@/lib/comparison";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";
const HISTORY_DAYS = 14;
const HISTORY_INTERVAL = "5";
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

type HistoryMap = Record<CompareSeriesId, CandlePoint[]>;

function emptyHistory(): HistoryMap {
  return {
    hynix_kospi: [],
    hynix_adr: [],
    micron: [],
  };
}

export type ComparisonDashboardState = {
  indexedPoints: IndexedPoint[];
  latestIndex: Partial<Record<CompareSeriesId, number>>;
  moves: Record<CompareSeriesId, SeriesMove>;
  spreads: {
    kospiVsAdr: number | null;
    kospiVsMu: number | null;
    adrVsMu: number | null;
  };
  ready: boolean;
};

export function useComparisonDashboard(): ComparisonDashboardState {
  const [histories, setHistories] = useState<HistoryMap>(emptyHistory);

  const historiesRef = useRef<HistoryMap>(emptyHistory());
  const lastTickAtRef = useRef<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const tickerToId = useMemo(() => {
    const map = new Map<string, CompareSeriesId>();
    for (const s of COMPARE_SERIES) {
      map.set(s.bybitTicker, s.id);
    }
    return map;
  }, []);

  const sampleChart = (id: CompareSeriesId, usdtPrice: number) => {
    if (usdtPrice <= 0) return;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec <= (lastTickAtRef.current[id] ?? 0)) return;
    lastTickAtRef.current[id] = nowSec;
    setHistories((prev) => {
      const next = {
        ...prev,
        [id]: applyTickToCandles(prev[id] ?? [], usdtPrice, nowSec),
      };
      historiesRef.current = next;
      return next;
    });
  };

  const fetchKlines = async (ticker: string, endMs?: number) => {
    const params = new URLSearchParams({
      symbol: ticker,
      interval: HISTORY_INTERVAL,
      days: String(HISTORY_DAYS),
    });
    if (endMs) params.set("end", String(endMs));
    const res = await fetch(`/api/bybit-kline?${params.toString()}`);
    const data = (await res.json()) as { bars?: CandlePoint[]; error?: string };
    if (!res.ok) throw new Error(data.error || "캔들 조회 실패");
    return data.bars ?? [];
  };

  useEffect(() => {
    historiesRef.current = histories;
  }, [histories]);

  // Historical load
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      await Promise.all(
        COMPARE_SERIES.map(async (series) => {
          try {
            const bars = await fetchKlines(series.bybitTicker);
            if (cancelled || bars.length === 0) return;
            setHistories((prev) => {
              const next = {
                ...prev,
                [series.id]: mergeCandles(prev[series.id] ?? [], bars),
              };
              historiesRef.current = next;
              return next;
            });
          } catch (e) {
            console.error(
              `[useComparisonDashboard] 캔들 실패 (${series.bybitTicker})`,
              e
            );
          }
        })
      );
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bybit REST + WebSocket
  useEffect(() => {
    shouldReconnectRef.current = true;

    const applyPrice = (id: CompareSeriesId, price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      sampleChart(id, price);
    };

    const fetchNow = async () => {
      await Promise.all(
        COMPARE_SERIES.map(async (series) => {
          try {
            const json = await fetchBybitJson<{
              result?: { list?: Array<{ lastPrice?: string }> };
            }>(
              `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${series.bybitTicker}`
            );
            const last = json.result?.list?.[0]?.lastPrice;
            if (last) applyPrice(series.id, parseFloat(last));
          } catch (e) {
            console.error(
              `[useComparisonDashboard] REST 실패 (${series.bybitTicker})`,
              e
            );
          }
        })
      );
    };
    void fetchNow();

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = (ws: WebSocket | null) => {
      if (!ws) return;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return;
      clearReconnectTimer();
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** attempt,
        RECONNECT_MAX_MS
      );
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const connect = () => {
      clearReconnectTimer();
      closeSocket(wsRef.current);
      wsRef.current = null;

      const ws = new WebSocket(BYBIT_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: COMPARE_SERIES.map((s) => `tickers.${s.bybitTicker}`),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            data?: { symbol?: string; lastPrice?: string };
          };
          const symbol = msg.data?.symbol;
          const last = msg.data?.lastPrice;
          if (!symbol || !last) return;
          const id = tickerToId.get(symbol);
          if (!id) return;
          applyPrice(id, parseFloat(last));
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        console.error("[useComparisonDashboard] WebSocket 오류");
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (shouldReconnectRef.current) scheduleReconnect();
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      closeSocket(wsRef.current);
      wsRef.current = null;
    };
  }, [tickerToId]);

  const indexedPoints = useMemo(
    () => buildIndexedSeries(histories),
    [histories]
  );
  const latestIndex = useMemo(
    () => latestIndexed(indexedPoints),
    [indexedPoints]
  );
  const moves = useMemo(() => buildSeriesMoves(indexedPoints), [indexedPoints]);

  return {
    indexedPoints,
    latestIndex,
    moves,
    spreads: {
      kospiVsAdr: spread(latestIndex, "hynix_kospi", "hynix_adr"),
      kospiVsMu: spread(latestIndex, "hynix_kospi", "micron"),
      adrVsMu: spread(latestIndex, "hynix_adr", "micron"),
    },
    ready: indexedPoints.length > 0,
  };
}
