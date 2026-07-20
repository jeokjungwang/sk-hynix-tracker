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
import {
  COMPARE_SERIES,
  type CompareSeriesId,
  type IndexedPoint,
} from "@/lib/comparison";

type ComparisonChartProps = {
  data: IndexedPoint[];
};

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

export default function ComparisonChart({ data }: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<
    Partial<Record<CompareSeriesId, ISeriesApi<"Line">>>
  >({});
  const followLiveRef = useRef(true);
  const pointCountRef = useRef(0);

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
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: theme.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 6,
      },
    });

    const refs: Partial<Record<CompareSeriesId, ISeriesApi<"Line">>> = {};
    for (const meta of COMPARE_SERIES) {
      const series = chart.addSeries(LineSeries, {
        color: meta.color,
        lineWidth: meta.id === "hynix_adr" ? 4 : 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat: {
          type: "custom",
          formatter: (price: number) =>
            `${price >= 0 ? "+" : ""}${price.toFixed(2)}%`,
        },
      });
      refs[meta.id] = series;
    }

    refs.hynix_kospi?.createPriceLine({
      price: 0,
      color: theme.zero,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "0%",
    });

    chartRef.current = chart;
    seriesRefs.current = refs;

    const onRange = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;
      const last = pointCountRef.current - 1;
      followLiveRef.current = range.to >= last - 3;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

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
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = {};
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const byId: Record<CompareSeriesId, { time: Time; value: number }[]> = {
      hynix_kospi: [],
      hynix_adr: [],
      micron: [],
    };

    for (const point of data) {
      for (const meta of COMPARE_SERIES) {
        const value = point.values[meta.id];
        if (value == null || !Number.isFinite(value)) continue;
        byId[meta.id].push({
          time: point.time as Time,
          value,
        });
      }
    }

    for (const meta of COMPARE_SERIES) {
      seriesRefs.current[meta.id]?.setData(byId[meta.id]);
    }

    const prevCount = pointCountRef.current;
    pointCountRef.current = data.length;

    if (prevCount === 0 || followLiveRef.current) {
      chart.timeScale().scrollToRealTime();
    }
  }, [data]);

  return <div ref={containerRef} className="h-full w-full min-w-0" />;
}
