"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Resolve chart time parts in Asia/Seoul (matches site clocks) */
function kstParts(time: Time): {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
} {
  if (typeof time === "object" && time !== null && "year" in time) {
    return {
      y: time.year,
      m: time.month,
      d: time.day,
      hh: 0,
      mm: 0,
    };
  }

  if (typeof time === "string") {
    const [ys, ms, ds] = time.split("-");
    return {
      y: Number(ys),
      m: Number(ms),
      d: Number(ds || 1),
      hh: 0,
      mm: 0,
    };
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(time * 1000));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hh = get("hour");
  // Some engines emit 24:00 for midnight
  if (hh === 24) hh = 0;

  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    hh,
    mm: get("minute"),
  };
}

/** Crosshair / selection label — KST date·time for 5m / D / M */
function formatCrosshairTime(time: Time, interval: ChartInterval): string {
  const { y, m, d, hh, mm } = kstParts(time);

  if (interval === "M") return `${y}-${pad2(m)}`;
  if (interval === "D") return `${y}-${pad2(m)}-${pad2(d)}`;
  return `${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mm)} (KST)`;
}

/** Axis ticks — always KST so they match clocks & selection label */
function formatTickMark(time: Time, tickMarkType: TickMarkType): string {
  const { y, m, d, hh, mm } = kstParts(time);

  switch (tickMarkType) {
    case TickMarkType.Year:
      return String(y);
    case TickMarkType.Month:
      return `${m}월`;
    case TickMarkType.DayOfMonth:
      return `${m}/${d}`;
    case TickMarkType.Time:
    case TickMarkType.TimeWithSeconds:
      return `${pad2(hh)}:${pad2(mm)}`;
    default:
      return `${m}/${d}`;
  }
}

function toChartTime(unixSec: number, _interval: ChartInterval): Time {
  // Keep UTC timestamps; all labels format in KST so axis matches site clocks
  return unixSec as Time;
}

function readChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--chart-text").trim() || "#94a3b8",
    grid: styles.getPropertyValue("--chart-grid").trim() || "rgba(30, 41, 59, 0.7)",
    cross: styles.getPropertyValue("--chart-cross").trim() || "rgba(148, 163, 184, 0.4)",
    label: styles.getPropertyValue("--accent").trim() || "#3182f6",
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

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
    setSelectedTime(null);
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      timeScale: {
        timeVisible: interval === "5",
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (time: Time) =>
          formatCrosshairTime(time, intervalRef.current),
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
        locale: "ko-KR",
        dateFormat: "yyyy-MM-dd",
        timeFormatter: (time: Time) =>
          formatCrosshairTime(time, intervalRef.current),
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          visible: true,
          labelVisible: true,
          color: theme.cross,
          labelBackgroundColor: theme.label,
        },
        horzLine: {
          visible: true,
          labelVisible: true,
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

    const onCrosshairMove = (param: { time?: Time }) => {
      if (param.time === undefined) return;
      const label = formatCrosshairTime(param.time, intervalRef.current);
      setSelectedTime((prev) => (prev === label ? prev : label));
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange);
    chart.subscribeCrosshairMove(onCrosshairMove);

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
            labelVisible: true,
            visible: true,
          },
          horzLine: {
            color: next.cross,
            labelBackgroundColor: next.label,
            labelVisible: true,
            visible: true,
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
      chart.unsubscribeCrosshairMove(onCrosshairMove);
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
    <div className="relative flex h-full w-full min-h-[200px] flex-col">
      <div
        ref={containerRef}
        className="min-h-0 w-full flex-1 cursor-grab touch-pan-x active:cursor-grabbing"
        title="캔들스틱 · 좌우 드래그 · 휠 줌"
      />
      <div
        className="flex h-7 shrink-0 items-center justify-center border-t border-[color:var(--border)] px-2"
        aria-live="polite"
      >
        <p
          className={`text-[12px] font-semibold tabular-nums tracking-tight ${
            selectedTime
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--muted)]"
          }`}
        >
          {selectedTime ?? "캔들을 눌러 날짜·시간 확인"}
        </p>
      </div>
      <p className="chart-hint pointer-events-none absolute left-2 top-2 z-10">
        ← 드래그 과거 · 휠 줌
      </p>
    </div>
  );
}
