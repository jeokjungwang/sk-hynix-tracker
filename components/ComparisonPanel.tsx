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
  if (value == null) return "text-[color:var(--label)]";
  if (Math.abs(value) < 0.15) return "text-[color:var(--muted)]";
  return value > 0 ? "toss-up" : "toss-down";
}

function gapTone(value: number | null): string {
  if (value == null) return "text-[color:var(--label)]";
  const abs = Math.abs(value);
  if (abs < 0.3) return "toss-ok";
  if (value > 0) return "toss-up";
  return "toss-down";
}

export default function ComparisonPanel() {
  const { indexedPoints, moves, spreads, ready } = useComparisonDashboard();

  return (
    <article className="toss-card flex min-w-0 flex-col gap-3 p-4">
      <header className="shrink-0 space-y-1">
        <p className="toss-label">Slope · Relative Move</p>
        <h2 className="toss-title text-[1.35rem] sm:text-[1.5rem]">
          본주 · ADR · MU
        </h2>
        <p className="text-[13px] font-medium leading-snug text-[color:var(--label)]">
          절대가 무시 · 같은 출발선(0%)에서 상승·하락 기울기 비교
        </p>
      </header>

      <div className="shrink-0 space-y-2">
        {COMPARE_SERIES.map((series) => {
          const move = moves[series.id];
          return (
            <div key={series.id} className="toss-panel px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="truncate text-[13px] font-bold tracking-tight">
                    {series.shortName}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${moveTone(move?.slope15m)}`}
                  >
                    {slopeLabel(move?.slope15m ?? null)}
                  </span>
                </div>
                <span
                  className="toss-price shrink-0 text-base"
                  style={{ color: series.color }}
                >
                  {formatPct(move?.fromBase)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[color:var(--label)]">
                  15분 기울기
                </span>
                <span className={`font-bold tabular-nums ${moveTone(move?.slope15m)}`}>
                  {formatPct(move?.slope15m)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[color:var(--label)]">
                  1시간 기울기
                </span>
                <span className={`font-bold tabular-nums ${moveTone(move?.slope1h)}`}>
                  {formatPct(move?.slope1h)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2">
        {(
          [
            ["본주↔ADR", spreads.kospiVsAdr],
            ["본주↔MU", spreads.kospiVsMu],
            ["ADR↔MU", spreads.adrVsMu],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="toss-panel px-2 py-2.5 text-center">
            <p className="toss-label text-[11px]">{label}</p>
            <p
              className={`toss-price mt-1 text-base ${gapTone(value)}`}
            >
              {formatPct(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="toss-panel flex h-[240px] w-full shrink-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[color:var(--border)] px-3 py-2.5">
          <p className="text-[13px] font-bold tracking-tight">
            24시간 기울기 비교 · 출발 0%
          </p>
        </div>
        <div className="h-[calc(240px-2.75rem)] w-full p-2">
          {ready ? (
            <ComparisonChart data={indexedPoints} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="toss-label">기울기 데이터 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
