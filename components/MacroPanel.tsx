"use client";

import { useMacroDashboard } from "@/hooks/useMacroDashboard";
import { MACRO_SERIES, type MacroId } from "@/lib/macro";

function formatValue(id: MacroId, value: number): string {
  if (!value || Number.isNaN(value)) return "-";
  if (id === "dollar") {
    return `₩${Math.round(value).toLocaleString("ko-KR")}`;
  }
  if (id === "wti") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (id === "us10y") {
    return `${value.toFixed(2)}%`;
  }
  if (id === "vix") {
    return value.toFixed(2);
  }
  if (id === "copper") {
    return `$${value.toFixed(3)}`;
  }
  if (id === "sox") {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(id: MacroId, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  if (id === "us10y") {
    return `${sign}${value.toFixed(2)}%p`;
  }
  return `${sign}${value.toFixed(2)}%`;
}

function changeTone(value: number | null | undefined): string {
  if (value == null) return "text-[color:var(--label)]";
  if (Math.abs(value) < 0.02) return "text-[color:var(--muted)]";
  return value > 0 ? "toss-up" : "toss-down";
}

export default function MacroPanel() {
  const { quotes, ready } = useMacroDashboard();

  return (
    <article className="toss-card flex min-w-0 flex-col gap-3 p-4">
      <header className="shrink-0 space-y-1">
        <p className="toss-label">Macro Board</p>
        <h2 className="toss-title text-[1.35rem] sm:text-[1.5rem]">
          국장 매크로
        </h2>
        <p className="text-[13px] font-medium leading-snug text-[color:var(--label)]">
          원달러 · WTI · 금리 · SOX · 구리 · VIX
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        {MACRO_SERIES.map((meta) => {
          const quote = quotes[meta.id];
          return (
            <div
              key={meta.id}
              className="toss-panel flex min-h-[96px] flex-col justify-between px-3 py-3"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="truncate text-[13px] font-semibold tracking-tight">
                  {meta.name}
                </span>
              </div>
              <p className="toss-price mt-2 text-[1.65rem] leading-none tracking-tight sm:text-[1.85rem]">
                {ready ? formatValue(meta.id, quote.value) : "-"}
              </p>
              <p
                className={`mt-2 text-[15px] font-bold tabular-nums ${changeTone(quote.changePct)}`}
              >
                {ready ? formatChange(meta.id, quote.changePct) : "-"}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
