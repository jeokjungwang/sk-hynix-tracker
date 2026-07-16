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

function spotCaption(label: SpotLabel): string {
  if (label === "NXT(데이터없음)") return "NXT 없음 · KRX 종가 유지";
  if (label === "NXT") return "넥스트레이드 현물";
  return "정규장(KRX) 현물";
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
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {stock.bybitTicker} · {stock.naverCode}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
            {stock.name}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SourceBadge label={stock.spotLabel} />
          <p className="text-[10px] text-slate-500">
            {spotCaption(stock.spotLabel)}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          선물 환산가 (KRW)
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {formatKrw(stock.futuresKrw)}
        </p>
        <p className="mt-2 font-mono text-sm font-medium text-yellow-400/80">
          {hasFutures ? formatUsdt(stock.lastPrice) : "-"}
        </p>
        <p className="mt-1 font-mono text-sm font-medium text-sky-300">
          ₩{formatRate(usdKrwRate)} · Upbit KRW-USDT
        </p>
        {!hasFutures && (
          <div className="mt-2">
            <Hint>가격 불러오는 중...</Hint>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              현물가 (네이버)
            </p>
            <SourceBadge label={stock.spotLabel} />
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-slate-50 sm:text-2xl">
            {formatKrw(stock.spotPrice)}
          </p>
          {stock.usingNxtFallback && hasSpot && (
            <Hint>NXT 일시 오류 · 정규장 종가 표시 중</Hint>
          )}
          {!hasSpot && <Hint>가격 불러오는 중...</Hint>}
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            괴리율 (Basis)
          </p>
          <p
            className={`mt-2 font-mono text-xl font-bold sm:text-2xl ${
              !hasBasis
                ? "text-slate-500"
                : stock.basis >= 0
                  ? "text-red-400"
                  : "text-blue-400"
            }`}
          >
            {formatBasis(stock.basis, hasBasis)}
          </p>
          {!hasBasis && <Hint>가격 불러오는 중...</Hint>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-xs font-semibold text-slate-300">
            선물 환산가 차트
          </p>
          <p className="text-[10px] text-slate-500">
            캔들 5분봉 · 양봉 빨강 · 음봉 파랑 · 최근 2주
          </p>
        </div>
        <div className="flex h-[240px] items-center justify-center overflow-x-auto p-2">
          {hasChartData ? (
            <div className="h-full w-full min-w-0">
              <TickerChart
                data={stock.priceHistory}
                loadBackData={stock.loadBackData}
                onNeedBars={stock.getBars}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">과거·실시간 데이터 불러오는 중...</p>
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
    <div className="flex flex-col gap-7">
      <header className="space-y-3 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Multi-Stock · Bybit Futures · Naver Spot
          </p>
          <SourceBadge label={headerLabel} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl lg:text-4xl">
            삼성전자 SK하이닉스 24시간 시장현황
          </h1>
          <p className="text-sm font-medium leading-relaxed text-sky-400">
            해외 bybit선물 금액을 통해 공휴일에도 시세확인 가능!
          </p>
          <p className="text-xs text-slate-500">
            09:00~15:30 → KRX · 그 외 → NXT (10초마다 자동 전환)
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            usdKrwRate={usdKrwRate}
          />
        ))}
      </section>

      <footer className="space-y-1 pb-2 text-center text-xs text-slate-600">
        <p>
          데이터: Bybit v5 · 네이버 KRX/NXT · 실시간 업비트 환율 적용
        </p>
        <p>
          현재 세션: {headerLabel} · 환율 ₩{formatRate(usdKrwRate)}
        </p>
      </footer>
    </div>
  );
}
