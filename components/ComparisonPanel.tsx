"use client";

import ComparisonChart from "@/components/ComparisonChart";
import {
  COMPARE_SERIES,
  slopeLabel,
} from "@/lib/comparison";
import { useComparisonDashboard } from "@/hooks/useComparisonDashboard";

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function moveTone(value: number | null | undefined): string {
  if (value == null) return "text-slate-500";
  if (Math.abs(value) < 0.15) return "text-slate-300";
  return value > 0 ? "text-red-400" : "text-blue-400";
}

function gapTone(value: number | null): string {
  if (value == null) return "text-slate-500";
  const abs = Math.abs(value);
  if (abs < 0.3) return "text-emerald-300";
  if (value > 0) return "text-red-300";
  return "text-blue-300";
}

export default function ComparisonPanel() {
  const { indexedPoints, moves, spreads, ready } = useComparisonDashboard();

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur">
      <header className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Slope · Relative Move
        </p>
        <h2 className="text-xl font-bold tracking-tight text-slate-50">
          본주 · ADR · MU
        </h2>
        <p className="text-[11px] leading-snug text-slate-400">
          절대가 무시 · 같은 출발선(0%)에서 상승·하락 기울기 비교
        </p>
      </header>

      <div className="space-y-1.5">
        {COMPARE_SERIES.map((series) => {
          const move = moves[series.id];
          return (
            <div
              key={series.id}
              className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="truncate text-xs font-semibold text-slate-200">
                    {series.shortName}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${moveTone(move?.slope15m)}`}
                  >
                    {slopeLabel(move?.slope15m ?? null)}
                  </span>
                </div>
                <span
                  className="shrink-0 font-mono text-sm font-bold"
                  style={{ color: series.color }}
                >
                  {formatPct(move?.fromBase)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">15분 기울기</span>
                <span className={`font-mono font-bold ${moveTone(move?.slope15m)}`}>
                  {formatPct(move?.slope15m)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">1시간 기울기</span>
                <span className={`font-mono font-bold ${moveTone(move?.slope1h)}`}>
                  {formatPct(move?.slope1h)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-2 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            본주↔ADR
          </p>
          <p
            className={`mt-0.5 font-mono text-base font-bold ${gapTone(spreads.kospiVsAdr)}`}
          >
            {formatPct(spreads.kospiVsAdr)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-2 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            본주↔MU
          </p>
          <p
            className={`mt-0.5 font-mono text-base font-bold ${gapTone(spreads.kospiVsMu)}`}
          >
            {formatPct(spreads.kospiVsMu)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-2 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            ADR↔MU
          </p>
          <p
            className={`mt-0.5 font-mono text-base font-bold ${gapTone(spreads.adrVsMu)}`}
          >
            {formatPct(spreads.adrVsMu)}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
        <div className="border-b border-slate-800 px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-300">
            24시간 기울기 비교 · 출발 0%
          </p>
        </div>
        <div className="flex h-[200px] items-center justify-center p-1.5">
          {ready ? (
            <ComparisonChart data={indexedPoints} />
          ) : (
            <p className="text-xs text-slate-500">기울기 데이터 불러오는 중...</p>
          )}
        </div>
      </div>
    </article>
  );
}
