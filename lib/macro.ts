import type { CandlePoint } from "@/lib/candles";

export type MacroId = "dollar" | "wti" | "buffett";

export type MacroMeta = {
  id: MacroId;
  name: string;
  shortName: string;
  unit: string;
  color: string;
  source: string;
};

export const MACRO_SERIES: readonly MacroMeta[] = [
  {
    id: "dollar",
    name: "달러지수",
    shortName: "DXY",
    unit: "pt",
    color: "#22d3ee",
    source: "Yahoo DX-Y.NYB",
  },
  {
    id: "wti",
    name: "WTI 원유",
    shortName: "WTI",
    unit: "USD",
    color: "#facc15",
    source: "Bybit CLUSDT",
  },
  {
    id: "buffett",
    name: "버핏지수",
    shortName: "Buffett",
    unit: "%",
    color: "#fca5a5",
    source: "Wilshire/GDP",
  },
] as const;

export type MacroQuote = {
  id: MacroId;
  value: number;
  changePct: number | null;
  history: CandlePoint[];
};

/** Classic Buffett zones (market cap / GDP) */
export function buffettZone(value: number): {
  label: string;
  tone: string;
} {
  if (!Number.isFinite(value) || value <= 0) {
    return { label: "-", tone: "text-[color:var(--label)]" };
  }
  if (value < 80) return { label: "저평가", tone: "toss-down" };
  if (value < 100) return { label: "적정", tone: "toss-ok" };
  if (value < 120) return { label: "고평가", tone: "toss-accent" };
  if (value < 150) return { label: "과열", tone: "toss-up" };
  return { label: "버블권", tone: "toss-up" };
}
