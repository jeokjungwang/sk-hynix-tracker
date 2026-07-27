"use client";

import type { ReactNode } from "react";
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
  return <p className="text-xs leading-relaxed text-slate-500">{children}</p>;
}

function SourceBadge({ label }: { label: SpotLabel }) {
  const isUnavailable = label === "NXT(데이터없음)";
  const isNxt = label === "NXT" || isUnavailable;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${
        isUnavailable
          ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
          : isNxt
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-emerald-300 bg-emerald-50 text-emerald-700"
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

  return (
    <article className="flex h-full min-h-0 flex-1 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">
            {stock.name}
          </h2>
          <p className="truncate text-[10px] font-medium text-slate-500">
            {stock.bybitTicker} · {stock.naverCode}
          </p>
        </div>
        <SourceBadge label={stock.spotLabel} />
      </header>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          선물 환산가 (KRW)
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {formatKrw(stock.futuresKrw)}
          </p>
          <p className="font-mono text-lg font-semibold tracking-tight text-slate-600">
            현물: {hasSpot ? formatKrw(stock.spotPrice) : "-"}
            <span className="mx-1.5 font-medium text-slate-400">/</span>
            괴리율:{" "}
            <span
              className={
                !hasBasis
                  ? "text-slate-400"
                  : stock.basis >= 0
                    ? "text-red-500"
                    : "text-blue-500"
              }
            >
              {formatBasis(stock.basis, hasBasis)}
            </span>
          </p>
        </div>
        <p className="mt-0.5 font-mono text-[11px] font-medium text-slate-500">
          <span className="text-amber-600">
            {hasFutures ? formatUsdt(stock.lastPrice) : "-"}
          </span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="text-sky-600">₩{formatRate(usdKrwRate)}</span>
        </p>
        {!hasFutures && (
          <div className="mt-1">
            <Hint>가격 불러오는 중...</Hint>
          </div>
        )}
      </div>
    </article>
  );
}

function StockChartPanel({ stock }: { stock: StockQuote }) {
  const hasChartData = stock.priceHistory.length > 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="text-xs font-semibold text-slate-700">
          {stock.name} · 선물 환산가 차트
        </p>
        <p className="text-[10px] text-slate-500">
          캔들 5분봉 · 양봉 빨강 · 음봉 파랑
        </p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        {hasChartData ? (
          <div className="h-full w-full min-h-0 min-w-0">
            <TickerChart
              data={stock.priceHistory}
              loadBackData={stock.loadBackData}
              onNeedBars={stock.getBars}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            과거·실시간 데이터 불러오는 중...
          </p>
        )}
      </div>
    </div>
  );
}

export default function StockDashboard() {
  const { stocks, usdKrwRate, preferredSpotSource } = useStockDashboard();
  const headerLabel: SpotLabel =
    preferredSpotSource === "NXT" ? "NXT" : "KRX";

  const samsung = stocks.find((s) => s.id === "samsung");
  const hynix = stocks.find((s) => s.id === "hynix");

  return (
    <>
      {/* 제목 영역 */}
      <header className="mb-2 shrink-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Multi-Stock · Bybit Futures · Naver Spot
          </p>
          <SourceBadge label={headerLabel} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          삼성전자 SK하이닉스 24시간 시장현황
        </h1>
        <p className="text-sm text-sky-600">
          해외 USDT 선물 금액을 통해 공휴일에도 시세 확인하자!
        </p>
      </header>

      {/* 카드 2개 배치 (가로 정렬) — 높이 최소화 */}
      <div className="flex h-auto shrink-0 flex-row gap-3">
        {samsung && (
          <div className="min-w-0 flex-1">
            <StockCard stock={samsung} usdKrwRate={usdKrwRate} />
          </div>
        )}
        {hynix && (
          <div className="min-w-0 flex-1">
            <StockCard stock={hynix} usdKrwRate={usdKrwRate} />
          </div>
        )}
      </div>

      {/* 차트 영역 (남은 공간 꽉 채우기) */}
      <div className="mt-3 flex min-h-0 flex-1 flex-row gap-3">
        {samsung && <StockChartPanel stock={samsung} />}
        {hynix && <StockChartPanel stock={hynix} />}
      </div>
    </>
  );
}
