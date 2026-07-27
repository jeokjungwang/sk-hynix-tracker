"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyTickToCandles,
  historyDaysForInterval,
  mergeCandles,
  scaleCandles,
  type CandlePoint,
  type ChartInterval,
} from "@/lib/candles";
import { fetchBybitJson } from "@/lib/bybitFetch";
import {
  fetchKlinesClient,
  loadCachedKlines,
  saveCachedKlines,
} from "@/lib/clientKlines";
import {
  pickSpotPrice,
  resolveSpotSource,
  type SpotLabel,
  type SpotSource,
} from "@/lib/marketSession";

export const STOCKS = [
  {
    id: "samsung",
    name: "삼성전자",
    bybitTicker: "SAMSUNGUSDT",
    naverCode: "005930",
  },
  {
    id: "hynix",
    name: "SK하이닉스",
    bybitTicker: "SKHYNIXUSDT",
    naverCode: "000660",
  },
] as const;

export type StockMeta = (typeof STOCKS)[number];

export type StockQuote = StockMeta & {
  lastPrice: number;
  spotPrice: number;
  krxPrice: number;
  nxtPrice: number | null;
  /** Session venue: KRX or NXT */
  spotSource: SpotSource;
  /** Badge text — may be NXT(데이터없음) */
  spotLabel: SpotLabel;
  usingNxtFallback: boolean;
  futuresKrw: number;
  basis: number;
  /** KRW candlesticks (history klines + live 5m buckets) */
  priceHistory: CandlePoint[];
  loadBackData: boolean;
  getBars: () => Promise<void>;
};

export type StockDashboardState = {
  stocks: StockQuote[];
  usdKrwRate: number;
  preferredSpotSource: SpotSource;
  chartInterval: ChartInterval;
  setChartInterval: (interval: ChartInterval) => void;
};

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";
const REFRESH_MS = 10_000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

type PriceMap = Record<string, number>;
type HistoryMap = Record<string, CandlePoint[]>;

type SpotBundle = {
  krxPrice: number;
  nxtPrice: number | null;
};

type SpotMap = Record<string, SpotBundle>;

function emptyPriceMap(): PriceMap {
  return Object.fromEntries(STOCKS.map((s) => [s.id, 0]));
}

function emptySpotMap(): SpotMap {
  return Object.fromEntries(
    STOCKS.map((s) => [s.id, { krxPrice: 0, nxtPrice: null }])
  );
}

function emptyHistoryMap(): HistoryMap {
  return Object.fromEntries(STOCKS.map((s) => [s.id, []]));
}

export function useStockDashboard(): StockDashboardState {
  const [usdKrwRate, setUsdKrwRate] = useState(0);
  const [lastPrices, setLastPrices] = useState<PriceMap>(emptyPriceMap);
  const [spotMap, setSpotMap] = useState<SpotMap>(emptySpotMap);
  const [preferredSpotSource, setPreferredSpotSource] = useState<SpotSource>(
    () => resolveSpotSource()
  );
  const [histories, setHistories] = useState<HistoryMap>(emptyHistoryMap);
  const [chartInterval, setChartIntervalState] =
    useState<ChartInterval>("5");

  const chartIntervalRef = useRef<ChartInterval>("5");
  const lastPricesRef = useRef<PriceMap>(emptyPriceMap());
  const usdKrwRateRef = useRef(0);
  const lastTickAtRef = useRef<Record<string, number>>(
    Object.fromEntries(STOCKS.map((s) => [s.id, 0]))
  );
  const historyLoadedRef = useRef<Record<string, boolean>>(
    Object.fromEntries(STOCKS.map((s) => [s.id, false]))
  );
  const historyLoadingRef = useRef<Record<string, boolean>>(
    Object.fromEntries(STOCKS.map((s) => [s.id, false]))
  );
  const historiesRef = useRef<HistoryMap>(emptyHistoryMap());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const tickerToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const stock of STOCKS) {
      map.set(stock.bybitTicker, stock.id);
      map.set(stock.bybitTicker.toLowerCase(), stock.id);
    }
    return map;
  }, []);

  /** Update / open the current candle bucket from a live trade */
  const sampleChart = (stockId: string, usdtPrice: number) => {
    if (usdtPrice <= 0) return;
    const nowSec = Math.floor(Date.now() / 1000);
    // Throttle React updates to ~1/sec while still folding into OHLC
    if (nowSec <= (lastTickAtRef.current[stockId] ?? 0)) return;
    lastTickAtRef.current[stockId] = nowSec;
    const interval = chartIntervalRef.current;
    setHistories((prev) => {
      const merged = applyTickToCandles(
        prev[stockId] ?? [],
        usdtPrice,
        nowSec,
        interval
      );
      const next = { ...prev, [stockId]: merged };
      historiesRef.current = next;
      const stock = STOCKS.find((s) => s.id === stockId);
      if (stock) saveCachedKlines(stock.bybitTicker, merged, interval);
      return next;
    });
  };

  const fetchKlines = async (stock: StockMeta, endMs?: number) => {
    const interval = chartIntervalRef.current;
    return fetchKlinesClient({
      symbol: stock.bybitTicker,
      interval,
      days: historyDaysForInterval(interval),
      endMs,
    });
  };

  useEffect(() => {
    historiesRef.current = histories;
  }, [histories]);

  const setChartInterval = (interval: ChartInterval) => {
    if (interval === chartIntervalRef.current) return;
    chartIntervalRef.current = interval;
    setChartIntervalState(interval);
    setHistories(emptyHistoryMap());
    historiesRef.current = emptyHistoryMap();
    for (const stock of STOCKS) {
      historyLoadedRef.current[stock.id] = false;
      historyLoadingRef.current[stock.id] = false;
    }
  };

  // Restore cached candles for current interval
  useEffect(() => {
    const interval = chartInterval;
    const next = emptyHistoryMap();
    let hasAny = false;
    for (const stock of STOCKS) {
      const cached = loadCachedKlines(stock.bybitTicker, interval);
      if (cached.length > 0) {
        next[stock.id] = cached;
        hasAny = true;
      }
    }
    if (hasAny) {
      historiesRef.current = next;
      setHistories(next);
    }
  }, [chartInterval]);

  /** Datafeed-style getBars: load / prepend historical candles */
  const getBarsForStock = async (stockId: string) => {
    const stock = STOCKS.find((s) => s.id === stockId);
    if (!stock || historyLoadingRef.current[stockId]) return;

    historyLoadingRef.current[stockId] = true;
    const interval = chartIntervalRef.current;
    try {
      const existing = historiesRef.current[stockId] ?? [];
      const oldestSec = existing[0]?.time;
      const endMs = oldestSec ? oldestSec * 1000 - 1 : undefined;
      const bars = await fetchKlines(stock, endMs);
      if (bars.length === 0) {
        historyLoadedRef.current[stockId] = true;
        return;
      }
      setHistories((prev) => {
        const merged = mergeCandles(prev[stockId] ?? [], bars);
        historiesRef.current = { ...prev, [stockId]: merged };
        saveCachedKlines(stock.bybitTicker, merged, interval);
        return { ...prev, [stockId]: merged };
      });
      historyLoadedRef.current[stockId] = true;
    } catch (e) {
      console.error(`[useStockDashboard] getBars 실패 (${stockId})`, e);
    } finally {
      historyLoadingRef.current[stockId] = false;
    }
  };

  // Historical load whenever interval changes
  useEffect(() => {
    let cancelled = false;
    const interval = chartInterval;

    const loadAll = async () => {
      await Promise.all(
        STOCKS.map(async (stock) => {
          historyLoadingRef.current[stock.id] = true;
          try {
            const bars = await fetchKlinesClient({
              symbol: stock.bybitTicker,
              interval,
              days: historyDaysForInterval(interval),
            });
            if (cancelled || bars.length === 0) return;
            setHistories((prev) => {
              const merged = mergeCandles(prev[stock.id] ?? [], bars);
              const next = { ...prev, [stock.id]: merged };
              historiesRef.current = next;
              saveCachedKlines(stock.bybitTicker, merged, interval);
              return next;
            });
            historyLoadedRef.current[stock.id] = true;
          } catch (e) {
            console.error(
              `[useStockDashboard] 과거 캔들 로드 실패 (${stock.bybitTicker})`,
              e
            );
          } finally {
            historyLoadingRef.current[stock.id] = false;
          }
        })
      );
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [chartInterval]);

  // Upbit KRW-USDT rate
  useEffect(() => {
    let cancelled = false;

    const fetchRate = async () => {
      try {
        const res = await fetch("/api/upbit-rate");
        const data = (await res.json()) as { trade_price?: number };
        if (!res.ok) {
          console.error("[useStockDashboard] 업비트 환율 API 실패", data);
          return;
        }
        const rate = data.trade_price;
        if (
          !cancelled &&
          typeof rate === "number" &&
          Number.isFinite(rate) &&
          rate > 0
        ) {
          usdKrwRateRef.current = rate;
          setUsdKrwRate(rate);
        }
      } catch (e) {
        console.error("[useStockDashboard] 업비트 환율 조회 실패", e);
      }
    };

    void fetchRate();
    const interval = setInterval(() => {
      void fetchRate();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Bybit linear REST + WebSocket
  useEffect(() => {
    shouldReconnectRef.current = true;

    const applyFuturesPrice = (stockId: string, price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      lastPricesRef.current = {
        ...lastPricesRef.current,
        [stockId]: price,
      };
      setLastPrices((prev) => ({ ...prev, [stockId]: price }));
      sampleChart(stockId, price);
    };

    const fetchFuturesNow = async () => {
      await Promise.all(
        STOCKS.map(async (stock) => {
          try {
            const json = await fetchBybitJson<{
              retCode?: number;
              result?: { list?: Array<{ symbol?: string; lastPrice?: string }> };
            }>(
              `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${stock.bybitTicker}`
            );
            const last = json.result?.list?.[0]?.lastPrice;
            if (last) applyFuturesPrice(stock.id, parseFloat(last));
          } catch (e) {
            console.error(
              `[useStockDashboard] Bybit REST 실패 (${stock.bybitTicker})`,
              e
            );
          }
        })
      );
    };
    void fetchFuturesNow();

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
            args: STOCKS.map((s) => `tickers.${s.bybitTicker}`),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            topic?: string;
            data?: { symbol?: string; lastPrice?: string };
          };
          const symbol = msg.data?.symbol;
          const last = msg.data?.lastPrice;
          if (!symbol || !last) return;

          const stockId = tickerToId.get(symbol);
          if (!stockId) return;

          applyFuturesPrice(stockId, parseFloat(last));
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        console.error("[useStockDashboard] Bybit WebSocket 오류");
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

  // Re-evaluate KRX/NXT session every 10s (same cadence as spot refresh)
  useEffect(() => {
    const tick = () => setPreferredSpotSource(resolveSpotSource());
    tick();
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Naver spot (KRX + NXT) for all stocks — every 10s
  useEffect(() => {
    let cancelled = false;

    const fetchSpots = async () => {
      // Auto-switch source on each refresh cycle
      setPreferredSpotSource(resolveSpotSource());

      await Promise.all(
        STOCKS.map(async (stock) => {
          try {
            const res = await fetch(`/api/stock?code=${stock.naverCode}`);
            const data = (await res.json()) as {
              krxPrice?: number;
              nxtPrice?: number | null;
              price?: number;
              error?: string;
            };
            if (!res.ok) {
              console.error(
                `[useStockDashboard] 현물 API 실패 (${stock.naverCode})`,
                data
              );
              return;
            }

            const krxPrice =
              typeof data.krxPrice === "number" && data.krxPrice > 0
                ? data.krxPrice
                : typeof data.price === "number" && data.price > 0
                  ? data.price
                  : 0;
            const nxtPrice =
              typeof data.nxtPrice === "number" && data.nxtPrice > 0
                ? data.nxtPrice
                : null;

            if (!cancelled && krxPrice > 0) {
              setSpotMap((prev) => ({
                ...prev,
                [stock.id]: { krxPrice, nxtPrice },
              }));
            }
          } catch (e) {
            console.error(
              `[useStockDashboard] 현물 조회 실패 (${stock.naverCode})`,
              e
            );
          }
        })
      );
    };

    void fetchSpots();
    const interval = setInterval(() => {
      void fetchSpots();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stocks: StockQuote[] = STOCKS.map((stock) => {
    const lastPrice = lastPrices[stock.id] ?? 0;
    const { krxPrice, nxtPrice } = spotMap[stock.id] ?? {
      krxPrice: 0,
      nxtPrice: null,
    };
    const {
      price: spotPrice,
      source: spotSource,
      label: spotLabel,
      usingFallback: usingNxtFallback,
    } = pickSpotPrice(krxPrice, nxtPrice, preferredSpotSource);
    const futuresKrw =
      lastPrice > 0 && usdKrwRate > 0 ? lastPrice * usdKrwRate : 0;
    const basis =
      spotPrice > 0 && futuresKrw > 0
        ? ((futuresKrw - spotPrice) / spotPrice) * 100
        : 0;

    const priceHistory = scaleCandles(histories[stock.id] ?? [], usdKrwRate);

    return {
      ...stock,
      lastPrice,
      spotPrice,
      krxPrice,
      nxtPrice,
      spotSource,
      spotLabel,
      usingNxtFallback,
      futuresKrw,
      basis,
      priceHistory,
      loadBackData: true,
      getBars: () => getBarsForStock(stock.id),
    };
  });

  return { stocks, usdKrwRate, preferredSpotSource, chartInterval, setChartInterval };
}
