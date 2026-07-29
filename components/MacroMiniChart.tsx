"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { CandlePoint } from "@/lib/candles";
import { MACRO_SERIES, type MacroId } from "@/lib/macro";

/** Match TickerChart — feed KST-shifted unix so axis labels read as Korea time */
const KST_OFFSET_SEC = 9 * 60 * 60;

type SeriesInput = {
  id: MacroId;
  history: CandlePoint[];
};

type MacroMiniChartProps = {
  series: SeriesInput[];
};

function toIndexed(history: CandlePoint[]): { time: Time; value: number }[] {
  const valid = history.filter((c) => c.close > 0);
  if (valid.length === 0) return [];
  const base = valid[0]!.close;
  return valid.map((c) => ({
    time: (c.time + KST_OFFSET_SEC) as Time,
    value: (c.close / base - 1) * 100,
  }));
}

function readChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--chart-text").trim() || "#94a3b8",
    grid: styles.getPropertyValue("--chart-grid").trim() || "rgba(30, 41, 59, 0.7)",
    cross: styles.getPropertyValue("--chart-cross").trim() || "rgba(148, 163, 184, 0.4)",
    label: styles.getPropertyValue("--chart-label").trim() || "#1e293b",
    zero: styles.getPropertyValue("--chart-zero").trim() || "rgba(148, 163, 184, 0.55)",
  };
}

export default function MacroMiniChart({ series }: MacroMiniChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Partial<Record<MacroId, ISeriesApi<"Line">>>>({});

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
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: theme.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        barSpacing: 4,
      },
    });

    const refs: Partial<Record<MacroId, ISeriesApi<"Line">>> = {};
    for (const meta of MACRO_SERIES) {
      refs[meta.id] = chart.addSeries(LineSeries, {
        color: meta.color,
        lineWidth: meta.id === "wti" ? 3 : 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: {
          type: "custom",
          formatter: (price: number) =>
            `${price >= 0 ? "+" : ""}${price.toFixed(2)}%`,
        },
      });
    }

    refs.dollar?.createPriceLine({
      price: 0,
      color: theme.zero,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "0%",
    });

    chartRef.current = chart;
    seriesRefs.current = refs;

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
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = {};
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    let any = false;
    for (const item of series) {
      const data = toIndexed(item.history);
      seriesRefs.current[item.id]?.setData(data);
      if (data.length > 0) any = true;
    }
    if (any) chart.timeScale().fitContent();
  }, [series]);

  return <div ref={containerRef} className="h-full min-h-[200px] w-full" />;
}
