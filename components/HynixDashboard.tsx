"use client";

import type { ReactNode } from "react";
import TickerChart from "@/components/TickerChart";
import { useBybitPrice } from "@/hooks/useBybitPrice";

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

function MetricCard({
  label,
  children,
  footer,
}: {
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] flex-col rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <div className="mt-4 flex flex-1 flex-col justify-center">{children}</div>
      {footer ? <div className="mt-4 border-t border-slate-800/80 pt-3">{footer}</div> : null}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-slate-500">{children}</p>;
}

export default function HynixDashboard() {
  const {
    lastPrice,
    lastPriceKrw,
    spotPriceKrw,
    usdKrwRate,
    basis,
    priceHistory,
  } = useBybitPrice();

  const hasFutures = lastPrice > 0 && lastPriceKrw > 0;
  const hasSpot = spotPriceKrw > 0;
  const hasBasis = hasFutures && hasSpot;
  const hasChartData = priceHistory.length > 0;

  return (
    <div className="flex flex-col gap-7">
      <header className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Bybit Futures · Naver Spot
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
          SK하이닉스 실시간 대시보드
        </h1>
        <p className="text-sm font-medium text-slate-400">
          선물(USDT) · KRW 환산 · 현물 · 괴리율
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="선물 환산가 (KRW)">
          <div>
            <p className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {formatKrw(lastPriceKrw)}
            </p>
            <p className="mt-2 font-mono text-sm font-medium text-yellow-400/80">
              {hasFutures ? formatUsdt(lastPrice) : "-"}
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
        </MetricCard>

        <MetricCard
          label="현물가 (네이버)"
          footer={<Hint>종목코드 000660 · 10초마다 갱신</Hint>}
        >
          <p className="font-mono text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            {formatKrw(spotPriceKrw)}
          </p>
          {!hasSpot && <Hint>가격 불러오는 중...</Hint>}
        </MetricCard>

        <MetricCard
          label="괴리율 (Basis)"
          footer={<Hint>(선물환산가 − 현물가) ÷ 현물가 × 100</Hint>}
        >
          <p
            className={`font-mono text-3xl font-bold tracking-tight sm:text-4xl ${
              !hasBasis
                ? "text-slate-500"
                : basis >= 0
                  ? "text-red-400"
                  : "text-blue-400"
            }`}
          >
            {formatBasis(basis, hasBasis)}
          </p>
          {!hasBasis && <Hint>가격 불러오는 중...</Hint>}
        </MetricCard>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-100">
            선물 환산가 실시간 차트
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Bybit SKHYNIXUSDT · lastPrice × 업비트 USDT/KRW
          </p>
        </div>
        <div className="flex h-[420px] items-center justify-center p-3 sm:p-5">
          {hasChartData ? (
            <div className="h-full w-full">
              <TickerChart data={priceHistory} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">가격 불러오는 중...</p>
          )}
        </div>
      </section>

      <footer className="space-y-1 pb-2 text-center text-xs text-slate-600">
        <p>데이터: Bybit v5 WebSocket · 네이버 금융(000660) · 실시간 업비트 환율 적용</p>
        <p>실시간 환율(업비트 기준) ₩{formatRate(usdKrwRate)}</p>
      </footer>
    </div>
  );
}
