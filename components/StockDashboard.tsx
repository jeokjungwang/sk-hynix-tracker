"use client";

import type { ReactNode } from "react";
import CoupangBanner from "@/components/CoupangBanner";
import MacroPanel from "@/components/MacroPanel";
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
  return <p className="toss-label mt-1">{children}</p>;
}

function SourceBadge({ label }: { label: SpotLabel }) {
  const isUnavailable = label === "NXT(데이터없음)";
  const isNxt = label === "NXT" || isUnavailable;
  const cls = isUnavailable
    ? "toss-badge-warn"
    : isNxt
      ? "toss-badge-nxt"
      : "toss-badge-krx";

  return (
    <span
      className={`toss-badge ${cls}`}
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
    <article className="toss-card flex min-w-0 flex-col gap-3 p-4">
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="toss-label truncate">
            {stock.bybitTicker} · {stock.naverCode}
          </p>
          <h2 className="toss-title truncate text-[1.35rem] sm:text-[1.5rem]">
            {stock.name}
          </h2>
        </div>
        <SourceBadge label={stock.spotLabel} />
      </header>

      <div className="toss-panel shrink-0 px-3.5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="toss-label">선물 환산가</p>
          <p className="text-sm font-medium tracking-tight">
            <span className="text-[color:var(--label)]">현물</span>{" "}
            <span className="toss-accent text-base font-semibold">
              {hasSpot ? formatKrw(stock.spotPrice) : "-"}
            </span>
            <span className="mx-1.5 text-[color:var(--muted)]">/</span>
            <span className="text-[color:var(--label)]">괴리율</span>{" "}
            <span
              className={
                !hasBasis
                  ? "text-[color:var(--label)]"
                  : stock.basis >= 0
                    ? "toss-up"
                    : "toss-down"
              }
            >
              {formatBasis(stock.basis, hasBasis)}
            </span>
          </p>
        </div>
        <p className="toss-price mt-2 text-[1.75rem] leading-none sm:text-[2rem]">
          {formatKrw(stock.futuresKrw)}
        </p>
        <p className="mt-2 text-xs font-medium text-[color:var(--label)]">
          <span className="toss-accent">
            {hasFutures ? formatUsdt(stock.lastPrice) : "-"}
          </span>
          <span className="mx-1.5 text-[color:var(--muted)]">·</span>
          <span>₩{formatRate(usdKrwRate)}</span>
        </p>
        {!hasFutures && <Hint>가격 불러오는 중...</Hint>}
      </div>

      <div className="toss-panel flex h-[240px] w-full shrink-0 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-2.5">
          <p className="text-[13px] font-semibold tracking-tight text-[color:var(--foreground)]">
            선물 환산가 · {intervalLabel}
          </p>
          <IntervalTabs value={chartInterval} onChange={onIntervalChange} />
        </div>
        <div className="h-[calc(240px-2.75rem)] w-full p-2">
          {hasChartData ? (
            <TickerChart
              data={stock.priceHistory}
              interval={chartInterval}
              loadBackData={stock.loadBackData}
              fitAll={chartInterval === "D" || chartInterval === "M"}
              onNeedBars={stock.getBars}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="toss-label">데이터 불러오는 중...</p>
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
    <div className="flex flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-3 pb-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2 pr-12 lg:pr-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="toss-label">Bybit Futures · Naver Spot</p>
            <SourceBadge label={headerLabel} />
          </div>
          <h1 className="text-[1.75rem] font-semibold leading-[1.25] tracking-[-0.03em] text-[color:var(--foreground)] sm:text-[2rem]">
            삼성전자 SK하이닉스 24시간 해외시장현황
          </h1>
          <p className="text-[15px] font-medium leading-snug text-[color:var(--accent)]">
            해외 bybit선물 금액으로 공휴일에도 시세 확인
          </p>
        </div>
        <MarketClocks />
      </header>

      <section className="flex flex-col gap-3 pb-2 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
        {samsung && (
          <StockCard
            stock={samsung}
            usdKrwRate={usdKrwRate}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
          />
        )}
        <CoupangBanner />
        {hynix && (
          <StockCard
            stock={hynix}
            usdKrwRate={usdKrwRate}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
          />
        )}
        <MacroPanel />
      </section>

      <footer className="shrink-0 space-y-0.5 pb-8 pt-1 text-center text-[12px] font-medium text-[color:var(--muted)]">
        <p>
          Bybit SAMSUNG·SKHYNIX·CLUSDT · 원달러 · 버핏(Wilshire/GDP) · 네이버 · 업비트 ·{" "}
          {headerLabel} · ₩{formatRate(usdKrwRate)}
        </p>
      </footer>
    </div>
  );
}
