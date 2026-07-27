"use client";

import type { ReactNode } from "react";
import ComparisonPanel from "@/components/ComparisonPanel";
import MarketClocks from "@/components/MarketClocks";
import TickerChart from "@/components/TickerChart";
import {
  useStockDashboard,
  type StockQuote,
} from "@/hooks/useStockDashboard";
import {
  CHART_INTERVALS,
  type ChartInterval,
} from "@/lib/candles";
import type { SpotLabel } from "@/lib/marketSession";

function formatKrw(value: number): string {
  if (!value || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsdt(value: number): string {
  if (!value || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} USDT`;
}

function formatRate(value: number): string {
  if (!value || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBasis(value: number, ready: boolean): string {
  if (!ready) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-slate-500">{children}</p>;
}

function SourceBadge({ label }: { label: SpotLabel }) {
  const isUnavailable = label === "NXT(데이터없음)";
  const isNxt = label === "NXT" || isUnavailable;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${
        isUnavailable
          ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200"
          : isNxt
            ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      }`}
      title={
        isUnavailable
          ? "NXT 시세 없음 · 마지막 KRX 종가 표시"
          : isNxt
            ? "넥스트레이드(NXT) 현물"
            : "정규장(KRX) 현물"
      }
    >
      {label}
    </span>
  );
}

function IntervalTabs({
  value,
  onChange,
}: {
  value: ChartInterval;
  onChange: (next: ChartInterval) => void;
}) {
  return (
    <div className="interval-tabs">
      {CHART_INTERVALS.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            data-active={active ? "true" : "false"}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function StockCard({
  stock,
  usdKrwRate,
  chartInterval,
  onIntervalChange,
}: {
  stock: StockQuote;
  usdKrwRate: number;
  chartInterval: ChartInterval;
  onIntervalChange: (next: ChartInterval) => void;
}) {
  const hasFutures = stock.lastPrice > 0 && stock.futuresKrw > 0;
  const hasSpot = stock.spotPrice > 0;
  const hasBasis = hasFutures && hasSpot;
  const hasChartData = stock.priceHistory.length > 0;
  const intervalLabel =
    CHART_INTERVALS.find((i) => i.id === chartInterval)?.label ?? "5분봉";

  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 backdrop-blur">
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {stock.bybitTicker} · {stock.naverCode}
          </p>
          <h2 className="truncate text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
            {stock.name}
          </h2>
        </div>
        <SourceBadge label={stock.spotLabel} />
      </header>

      <div className="shrink-0 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            선물 환산가 (KRW)
          </p>
          <p className="font-mono text-sm font-semibold tracking-tight">
            <span className="text-slate-400">현물:</span>{" "}
            <span className="text-base font-bold text-yellow-400">
              {hasSpot ? formatKrw(stock.spotPrice) : "-"}
            </span>
            <span className="mx-1.5 text-slate-600">/</span>
            <span className="text-slate-400">괴리율:</span>{" "}
            <span
              className={
                !hasBasis
                  ? "text-slate-500"
                  : stock.basis >= 0
                    ? "text-red-400"
                    : "text-blue-400"
              }
            >
              {formatBasis(stock.basis, hasBasis)}
            </span>
          </p>
        </div>
        <p className="mt-1 font-mono text-2xl font-bold leading-none tracking-tight text-white">
          {formatKrw(stock.futuresKrw)}
        </p>
        <p className="mt-1 font-mono text-xs font-medium text-slate-400">
          <span className="text-yellow-400/80">
            {hasFutures ? formatUsdt(stock.lastPrice) : "-"}
          </span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="text-sky-300">₩{formatRate(usdKrwRate)}</span>
        </p>
        {!hasFutures && <Hint>가격 불러오는 중...</Hint>}
      </div>

      <div className="flex h-[240px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-300">
            선물 환산가 차트 · {intervalLabel}
          </p>
          <IntervalTabs value={chartInterval} onChange={onIntervalChange} />
        </div>
        <div className="h-[calc(240px-2.25rem)] w-full p-1.5">
          {hasChartData ? (
            <TickerChart
              data={stock.priceHistory}
              loadBackData={stock.loadBackData}
              onNeedBars={stock.getBars}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-slate-500">데이터 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function StockDashboard() {
  const {
    stocks,
    usdKrwRate,
    preferredSpotSource,
    chartInterval,
    setChartInterval,
  } = useStockDashboard();
  const headerLabel: SpotLabel =
    preferredSpotSource === "NXT" ? "NXT" : "KRX";

  const samsung = stocks.find((s) => s.id === "samsung");
  const hynix = stocks.find((s) => s.id === "hynix");

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-y-contain">
      <header className="flex shrink-0 flex-col gap-3 pb-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5 pr-12 lg:pr-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Multi-Stock · Bybit Futures · Naver Spot
            </p>
            <SourceBadge label={headerLabel} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
            삼성전자 SK하이닉스 24시간 시장현황
          </h1>
          <p className="text-sm font-medium text-sky-400">
            해외 bybit선물 금액을 통해 공휴일에도 시세확인 가능!
          </p>
        </div>
        <MarketClocks />
      </header>

      {/* 세로/모바일: 스크롤 · PC 와이드: 3열. 차트는 항상 고정 높이로 표시 */}
      <section className="flex flex-col gap-3 pb-4 lg:grid lg:grid-cols-3 lg:items-start">
        {samsung && (
          <StockCard
            stock={samsung}
            usdKrwRate={usdKrwRate}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
          />
        )}
        {hynix && (
          <StockCard
            stock={hynix}
            usdKrwRate={usdKrwRate}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
          />
        )}
        <ComparisonPanel />
      </section>

      <footer className="shrink-0 space-y-0.5 pb-2 text-center text-[11px] text-slate-600">
        <p>
          Bybit SAMSUNG·SKHYNIX·SKHY·MU · 네이버 KRX/NXT · 업비트 환율 ·{" "}
          {headerLabel} · ₩{formatRate(usdKrwRate)}
        </p>
      </footer>
    </div>
  );
}
