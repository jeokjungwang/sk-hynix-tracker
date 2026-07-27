"use client";

import type { ReactNode } from "react";
import ComparisonPanel from "@/components/ComparisonPanel";
import MarketClocks from "@/components/MarketClocks";
import TickerChart from "@/components/TickerChart";
import {
  useStockDashboard,
  type StockQuote,
} from "@/hooks/useStockDashboard";
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

function StockCard({
  stock,
  usdKrwRate,
}: {
  stock: StockQuote;
  usdKrwRate: number;
}) {
  const hasFutures = stock.lastPrice > 0 && stock.futuresKrw > 0;
  const hasSpot = stock.spotPrice > 0;
  const hasBasis = hasFutures && hasSpot;
  const hasChartData = stock.priceHistory.length > 0;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {stock.bybitTicker} · {stock.naverCode}
          </p>
          <h2 className="truncate text-xl font-bold tracking-tight text-slate-50">
            {stock.name}
          </h2>
        </div>
        <SourceBadge label={stock.spotLabel} />
      </header>

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          선물 환산가 (KRW)
        </p>
        <p className="mt-1 font-mono text-[1.75rem] font-bold leading-none tracking-tight text-white">
          {formatKrw(stock.futuresKrw)}
        </p>
        <p className="mt-1.5 font-mono text-xs font-medium text-yellow-400/80">
          {hasFutures ? formatUsdt(stock.lastPrice) : "-"}
        </p>
        <p className="mt-0.5 font-mono text-xs font-medium text-sky-300">
          ₩{formatRate(usdKrwRate)}
        </p>
        {!hasFutures && <Hint>가격 불러오는 중...</Hint>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            현물가
          </p>
          <p className="mt-1 font-mono text-xl font-bold leading-tight text-slate-50">
            {formatKrw(stock.spotPrice)}
          </p>
          {!hasSpot && <Hint>불러오는 중...</Hint>}
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            괴리율
          </p>
          <p
            className={`mt-1 font-mono text-xl font-bold leading-tight ${
              !hasBasis
                ? "text-slate-500"
                : stock.basis >= 0
                  ? "text-red-400"
                  : "text-blue-400"
            }`}
          >
            {formatBasis(stock.basis, hasBasis)}
          </p>
          {!hasBasis && <Hint>불러오는 중...</Hint>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
        <div className="border-b border-slate-800 px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-300">
            선물 환산가 차트 · 5분봉
          </p>
        </div>
        <div className="flex h-[200px] items-center justify-center p-1.5">
          {hasChartData ? (
            <div className="h-full w-full min-w-0">
              <TickerChart
                data={stock.priceHistory}
                loadBackData={stock.loadBackData}
                onNeedBars={stock.getBars}
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500">데이터 불러오는 중...</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function StockDashboard() {
  const { stocks, usdKrwRate, preferredSpotSource } = useStockDashboard();
  const headerLabel: SpotLabel =
    preferredSpotSource === "NXT" ? "NXT" : "KRX";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4 pb-0.5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Multi-Stock · Bybit Futures · Naver Spot
            </p>
            <SourceBadge label={headerLabel} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            삼성전자 SK하이닉스 24시간 시장현황
          </h1>
          <p className="text-sm font-medium text-sky-400">
            해외 bybit선물 금액을 통해 공휴일에도 시세확인 가능!
          </p>
        </div>
        <MarketClocks />
      </header>

      <section className="grid grid-cols-3 items-stretch gap-3">
        {stocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            usdKrwRate={usdKrwRate}
          />
        ))}
        <ComparisonPanel />
      </section>

      <footer className="space-y-0.5 pb-1 text-center text-[11px] text-slate-600">
        <p>
          Bybit SAMSUNG·SKHYNIX·SKHY·MU · 네이버 KRX/NXT · 업비트 환율 · {headerLabel} · ₩
          {formatRate(usdKrwRate)}
        </p>
      </footer>
    </div>
  );
}
