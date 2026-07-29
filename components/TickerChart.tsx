"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { CandlePoint, ChartInterval } from "@/lib/candles";

export type { CandlePoint };
/** @deprecated use CandlePoint — kept for older imports */
export type PricePoint = CandlePoint;

type TickerChartProps = {
  data: CandlePoint[];
  interval?: ChartInterval;
  loadBackData?: boolean;
  /** When true (daily/monthly), fit all bars into the visible width */
  fitAll?: boolean;
  onNeedBars?: () => void | Promise<void>;
};

/** Keep ≤8 chars so lightweight-charts tick labels don't overlap */
function formatTickMark(time: Time, tickMarkType: TickMarkType): string {
  let y: number;
  let m: number;
  let d: number;
  let hh = 0;
  let mm = 0;

  if (typeof time === "string") {
    const [ys, ms, ds] = time.split("-");
    y = Number(ys);
    m = Number(ms);
    d = Number(ds);
  } else if (typeof time === "object") {
    y = time.year;
    m = time.month;
    d = time.day;
  } else {
    const date = new Date(time * 1000);
    y = date.getUTCFullYear();
    m = date.getUTCMonth() + 1;
    d = date.getUTCDate();
    hh = date.getUTCHours();
    mm = date.getUTCMinutes();
  }

  switch (tickMarkType) {
    case TickMarkType.Year:
      return String(y);
    case TickMarkType.Month:
      return `${m}월`;
    case TickMarkType.DayOfMonth:
      return `${m}/${d}`;
    case TickMarkType.Time:
    case TickMarkType.TimeWithSeconds:
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    default:
      return `${m}/${d}`;
  }
}

function toChartTime(unixSec: number, interval: ChartInterval): Time {
  if (interval === "5") return unixSec as Time;
  const date = new Date(unixSec * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

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
  interval = "5",
  loadBackData = true,
  fitAll = false,
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
  const fitAllRef = useRef(fitAll);
  const intervalRef = useRef(interval);

  useEffect(() => {
    onNeedBarsRef.current = onNeedBars;
  }, [onNeedBars]);

  useEffect(() => {
    loadBackDataRef.current = loadBackData;
  }, [loadBackData]);

  useEffect(() => {
    fitAllRef.current = fitAll;
  }, [fitAll]);

  useEffect(() => {
    intervalRef.current = interval;
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      timeScale: {
        timeVisible: interval === "5",
        secondsVisible: false,
      },
    });
  }, [interval]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = readChartTheme();
    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 1),
      height: Math.max(container.clientHeight, 1),
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.text,
        fontFamily:
          '"Pretendard Variable", Pretendard, var(--font-geist-mono), ui-monospace, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      localization: {
        locale: "en-US",
        dateFormat: "yyyy-MM-dd",
        timeFormatter: (time: Time) => {
          if (typeof time === "object" && "year" in time) {
            return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
          }
          if (typeof time === "string") return time;
          const date = new Date(time * 1000);
          const md = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
          const hm = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
          return intervalRef.current === "5" ? `${md} ${hm}` : md;
        },
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
        scaleMargins: { top: 0.12, bottom: 0.14 },
      },
      timeScale: {
        borderColor: theme.grid,
        timeVisible: intervalRef.current === "5",
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: formatTickMark,
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
      upColor: "#f04452",
      downColor: "#3182f6",
      borderUpColor: "#f04452",
      borderDownColor: "#3182f6",
      wickUpColor: "#f04452",
      wickDownColor: "#3182f6",
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

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

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
      ro.disconnect();
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
        time: toChartTime(c.time, intervalRef.current),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    const prevCount = pointCountRef.current;
    pointCountRef.current = candleData.length;
    series.setData(candleData);

    // Daily/monthly: show full history width. Intraday: keep a recent window.
    if (fitAllRef.current) {
      chart.timeScale().fitContent();
      followLiveRef.current = true;
      return;
    }

    if (prevCount === 0 || candleData.length - prevCount > 20) {
      const visible = Math.min(120, candleData.length);
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(candleData.length - visible, 0),
        to: candleData.length - 1,
      });
      return;
    }

    if (followLiveRef.current) {
      chart.timeScale().scrollToRealTime();
    }
  }, [data, interval]);

  return (
    <div className="relative h-full w-full min-h-[200px]">
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-pan-x active:cursor-grabbing"
        title="캔들스틱 · 좌우 드래그 · 휠 줌"
      />
      <p className="chart-hint pointer-events-none absolute left-2 top-2 z-10">
        ← 드래그 과거 · 휠 줌
      </p>
    </div>
  );
}
