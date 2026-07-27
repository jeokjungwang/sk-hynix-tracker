"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { CandlePoint } from "@/lib/candles";

export type { CandlePoint };
/** @deprecated use CandlePoint — kept for older imports */
export type PricePoint = CandlePoint;

type TickerChartProps = {
  data: CandlePoint[];
  loadBackData?: boolean;
  onNeedBars?: () => void | Promise<void>;
};

function readChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--chart-text").trim() || "#94a3b8",
    grid: styles.getPropertyValue("--chart-grid").trim() || "rgba(30, 41, 59, 0.7)",
    cross: styles.getPropertyValue("--chart-cross").trim() || "rgba(148, 163, 184, 0.4)",
    label: styles.getPropertyValue("--chart-label").trim() || "#1e293b",
  };
}

export default function TickerChart({
  data,
  loadBackData = true,
  onNeedBars,
}: TickerChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const followLiveRef = useRef(true);
  const pointCountRef = useRef(0);
  const onNeedBarsRef = useRef(onNeedBars);
  const loadingMoreRef = useRef(false);
  const loadBackDataRef = useRef(loadBackData);

  useEffect(() => {
    onNeedBarsRef.current = onNeedBars;
  }, [onNeedBars]);

  useEffect(() => {
    loadBackDataRef.current = loadBackData;
  }, [loadBackData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = readChartTheme();
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.text,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: theme.cross,
          labelBackgroundColor: theme.label,
        },
        horzLine: {
          color: theme.cross,
          labelBackgroundColor: theme.label,
        },
      },
      rightPriceScale: {
        borderColor: theme.grid,
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: theme.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#f87171",
      downColor: "#60a5fa",
      borderUpColor: "#f87171",
      borderDownColor: "#60a5fa",
      wickUpColor: "#f87171",
      wickDownColor: "#60a5fa",
      borderVisible: true,
      wickVisible: true,
      priceFormat: {
        type: "custom",
        formatter: (price: number) =>
          new Intl.NumberFormat("ko-KR", {
            style: "currency",
            currency: "KRW",
            maximumFractionDigits: 0,
          }).format(price),
      },
    });

    const onVisibleRangeChange = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;

      const lastIndex = Math.max(pointCountRef.current - 1, 0);
      followLiveRef.current = range.to >= lastIndex - 1.5;

      if (
        loadBackDataRef.current &&
        range.from < 8 &&
        !loadingMoreRef.current &&
        onNeedBarsRef.current
      ) {
        loadingMoreRef.current = true;
        void Promise.resolve(onNeedBarsRef.current()).finally(() => {
          window.setTimeout(() => {
            loadingMoreRef.current = false;
          }, 1200);
        });
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange);

    chartRef.current = chart;
    seriesRef.current = series;

    const syncTheme = () => {
      const next = readChartTheme();
      chart.applyOptions({
        layout: { textColor: next.text },
        grid: {
          vertLines: { color: next.grid },
          horzLines: { color: next.grid },
        },
        crosshair: {
          vertLine: {
            color: next.cross,
            labelBackgroundColor: next.label,
          },
          horzLine: {
            color: next.cross,
            labelBackgroundColor: next.label,
          },
        },
        rightPriceScale: { borderColor: next.grid },
        timeScale: { borderColor: next.grid },
      });
    };

    const mo = new MutationObserver(syncTheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      mo.disconnect();
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || data.length === 0) return;

    const unique = new Map<number, CandlePoint>();
    for (const candle of data) {
      unique.set(candle.time, candle);
    }

    const candleData = Array.from(unique.values())
      .sort((a, b) => a.time - b.time)
      .map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    const prevCount = pointCountRef.current;
    pointCountRef.current = candleData.length;
    series.setData(candleData);

    if (prevCount === 0 || followLiveRef.current) {
      chart.timeScale().scrollToRealTime();
    }
  }, [data]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-pan-x active:cursor-grabbing"
        title="캔들스틱 · 좌우 드래그 · 휠 줌"
      />
      <p className="pointer-events-none absolute bottom-2 left-3 z-10 rounded bg-slate-950/70 px-2 py-1 text-[10px] font-medium tracking-wide text-slate-400">
        캔들 5분봉 · ← 드래그 과거 · 휠 줌
        {loadBackData ? " · load_back_data" : ""}
      </p>
    </div>
  );
}
