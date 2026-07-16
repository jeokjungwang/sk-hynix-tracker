"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyTickToCandles,
  scaleCandles,
  type CandlePoint,
} from "@/lib/candles";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";
const BYBIT_REST_URL =
  "https://api.bybit.com/v5/market/tickers?category=linear&symbol=SKHYNIXUSDT";
const TICKER_TOPIC = "tickers.SKHYNIXUSDT";
const REFRESH_MS = 10_000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export type BybitPriceState = {
  lastPrice: number;
  usdKrwRate: number;
  futuresKrw: number;
  lastPriceKrw: number;
  spotPrice: number;
  spotPriceKrw: number;
  basis: number;
  priceHistory: CandlePoint[];
};

export function useBybitPrice(): BybitPriceState {
  const [lastPrice, setLastPrice] = useState(0);
  const [usdKrwRate, setUsdKrwRate] = useState(0);
  const [spotPrice, setSpotPrice] = useState(0);
  const [usdtCandles, setUsdtCandles] = useState<CandlePoint[]>([]);

  const lastPriceRef = useRef(0);
  const usdKrwRateRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const sampleChart = (usdtPrice: number) => {
    if (usdtPrice <= 0) return;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec <= lastSampleAtRef.current) return;
    lastSampleAtRef.current = nowSec;
    setUsdtCandles((prev) => applyTickToCandles(prev, usdtPrice, nowSec));
  };

  useEffect(() => {
    let cancelled = false;

    const fetchRate = async () => {
      try {
        const res = await fetch("/api/upbit-rate");
        const data = (await res.json()) as { trade_price?: number };
        if (!res.ok) return;
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
        console.error("[useBybitPrice] 업비트 환율 조회 실패", e);
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

  useEffect(() => {
    shouldReconnectRef.current = true;

    const applyFuturesPrice = (price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      lastPriceRef.current = price;
      setLastPrice(price);
      sampleChart(price);
    };

    const fetchFuturesNow = async () => {
      try {
        const res = await fetch(BYBIT_REST_URL, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "application/json",
          },
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Bybit API 요청 실패: ${res.status}`);
        }
        const json = (await res.json()) as {
          result?: { list?: Array<{ lastPrice?: string }> };
        };
        const raw = json.result?.list?.[0]?.lastPrice;
        if (raw) applyFuturesPrice(parseFloat(raw));
      } catch (e) {
        console.error("[useBybitPrice] Bybit REST 조회 실패", e);
      }
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
            args: [TICKER_TOPIC],
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            topic?: string;
            data?: { lastPrice?: string };
          };
          if (msg.topic !== TICKER_TOPIC || !msg.data?.lastPrice) return;
          applyFuturesPrice(parseFloat(msg.data.lastPrice));
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        console.error("[useBybitPrice] Bybit WebSocket 오류");
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSpot = async () => {
      try {
        const res = await fetch("/api/hynix");
        const data = (await res.json()) as { price?: number };
        if (!res.ok) return;
        if (!cancelled && typeof data.price === "number" && data.price > 0) {
          setSpotPrice(data.price);
        }
      } catch (e) {
        console.error("[useBybitPrice] 현물 조회 실패", e);
      }
    };

    void fetchSpot();
    const interval = setInterval(() => {
      void fetchSpot();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const futuresKrw =
    lastPrice > 0 && usdKrwRate > 0 ? lastPrice * usdKrwRate : 0;
  const basis =
    spotPrice > 0 && futuresKrw > 0
      ? ((futuresKrw - spotPrice) / spotPrice) * 100
      : 0;

  return {
    lastPrice,
    usdKrwRate,
    futuresKrw,
    lastPriceKrw: futuresKrw,
    spotPrice,
    spotPriceKrw: spotPrice,
    basis,
    priceHistory: scaleCandles(usdtCandles, usdKrwRate),
  };
}
