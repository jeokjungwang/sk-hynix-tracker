"use client";

import MacroMiniChart from "@/components/MacroMiniChart";
import { useMacroDashboard } from "@/hooks/useMacroDashboard";
import { MACRO_SERIES, buffettZone } from "@/lib/macro";

function formatValue(id: string, value: number): string {
  if (!value || Number.isNaN(value)) return "-";
  if (id === "buffett") return `${value.toFixed(1)}%`;
  if (id === "wti") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function changeTone(value: number | null | undefined): string {
  if (value == null) return "text-[color:var(--label)]";
  if (Math.abs(value) < 0.05) return "text-[color:var(--muted)]";
  return value > 0 ? "toss-up" : "toss-down";
}

export default function MacroPanel() {
  const { dollar, wti, buffett, ready } = useMacroDashboard();

  const quotes = {
    dollar,
    wti,
    buffett,
  };

  const zone = buffettZone(buffett.value);
  const chartSeries = MACRO_SERIES.map((meta) => ({
    id: meta.id,
    history: quotes[meta.id].history ?? [],
  }));
  const hasChart = chartSeries.some((s) => s.history.length > 2);

  return (
    <article className="toss-card flex min-w-0 flex-col gap-3 p-4">
      <header className="shrink-0 space-y-1">
        <p className="toss-label">Macro · Dollar · Oil · Valuation</p>
        <h2 className="toss-title text-[1.35rem] sm:text-[1.5rem]">
          달러 · WTI · 버핏지수
        </h2>
        <p className="text-[13px] font-medium leading-snug text-[color:var(--label)]">
          DXY · 원유 · 시총/GDP 밸류에이션
        </p>
      </header>

      <div className="shrink-0 space-y-2">
        {MACRO_SERIES.map((meta) => {
          const quote = quotes[meta.id];
          return (
            <div key={meta.id} className="toss-panel px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="truncate text-[13px] font-semibold tracking-tight">
                    {meta.name}
                  </span>
                  {meta.id === "buffett" && (
                    <span className={`text-[11px] font-semibold ${zone.tone}`}>
                      {zone.label}
                    </span>
                  )}
                </div>
                <span className="toss-price shrink-0 text-base">
                  {formatValue(meta.id, quote.value)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[color:var(--label)]">
                  {meta.source}
                </span>
                <span
                  className={`font-semibold tabular-nums ${changeTone(quote.changePct)}`}
                >
                  {formatPct(quote.changePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="toss-panel flex h-[240px] w-full shrink-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center border-b border-[color:var(--border)] px-3 py-2.5">
          <p className="text-[13px] font-semibold tracking-tight text-[color:var(--foreground)]">
            상대 변동 · 출발 0%
          </p>
        </div>
        <div className="h-[calc(240px-2.75rem)] w-full p-2">
          {ready && hasChart ? (
            <MacroMiniChart series={chartSeries} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="toss-label">매크로 데이터 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
