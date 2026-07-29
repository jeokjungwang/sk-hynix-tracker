"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBybitJson } from "@/lib/bybitFetch";
import {
  emptyMacroQuote,
  MACRO_SERIES,
  type MacroId,
  type MacroQuote,
} from "@/lib/macro";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";
const REFRESH_MS = 30_000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

type MacroPayload = {
  quotes?: Partial<Record<MacroId, MacroQuote>>;
  error?: string;
};

export type MacroDashboardState = {
  quotes: Record<MacroId, MacroQuote>;
  ready: boolean;
};

function emptyMap(): Record<MacroId, MacroQuote> {
  return Object.fromEntries(
    MACRO_SERIES.map((m) => [m.id, emptyMacroQuote(m.id)])
  ) as Record<MacroId, MacroQuote>;
}

export function useMacroDashboard(): MacroDashboardState {
  const [quotes, setQuotes] = useState<Record<MacroId, MacroQuote>>(emptyMap);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/macro");
        const data = (await res.json()) as MacroPayload;
        if (!res.ok || cancelled || !data.quotes) return;

        setQuotes((prev) => {
          const next = { ...prev };
          for (const meta of MACRO_SERIES) {
            const q = data.quotes?.[meta.id];
            if (q && q.value > 0) next[meta.id] = q;
          }
          return next;
        });
      } catch (e) {
        console.error("[useMacroDashboard] /api/macro 실패", e);
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Bybit CLUSDT realtime for WTI
  useEffect(() => {
    shouldReconnectRef.current = true;

    const applyWti = (price: number, changePct?: number | null) => {
      if (!Number.isFinite(price) || price <= 0) return;
      setQuotes((prev) => ({
        ...prev,
        wti: {
          id: "wti",
          value: price,
          changePct:
            changePct != null && Number.isFinite(changePct)
              ? changePct
              : prev.wti.changePct,
        },
      }));
    };

    const fetchNow = async () => {
      try {
        const json = await fetchBybitJson<{
          result?: {
            list?: Array<{ lastPrice?: string; price24hPcnt?: string }>;
          };
        }>(
          "https://api.bybit.com/v5/market/tickers?category=linear&symbol=CLUSDT"
        );
        const row = json.result?.list?.[0];
        const last = parseFloat(row?.lastPrice ?? "");
        const pct = parseFloat(row?.price24hPcnt ?? "");
        applyWti(last, Number.isFinite(pct) ? pct * 100 : null);
      } catch (e) {
        console.error("[useMacroDashboard] WTI REST 실패", e);
      }
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
            args: ["tickers.CLUSDT"],
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            data?: { lastPrice?: string; price24hPcnt?: string };
          };
          const last = parseFloat(msg.data?.lastPrice ?? "");
          const pct = parseFloat(msg.data?.price24hPcnt ?? "");
          if (last > 0) {
            applyWti(last, Number.isFinite(pct) ? pct * 100 : null);
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        console.error("[useMacroDashboard] WTI WebSocket 오류");
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

  const ready = useMemo(
    () => MACRO_SERIES.some((m) => (quotes[m.id]?.value ?? 0) > 0),
    [quotes]
  );

  return { quotes, ready };
}
