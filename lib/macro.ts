import type { CandlePoint } from "@/lib/candles";

export type MacroId =
  | "dollar"
  | "wti"
  | "us10y"
  | "sox"
  | "copper"
  | "vix";

export type MacroMeta = {
  id: MacroId;
  name: string;
  shortName: string;
  color: string;
  yahooSymbol?: string;
};

/** 국장 매크로 6종 — 원달러·WTI + 금리·반도체·구리·VIX */
export const MACRO_SERIES: readonly MacroMeta[] = [
  {
    id: "dollar",
    name: "원달러",
    shortName: "USD/KRW",
    color: "#3182f6",
    yahooSymbol: "USDKRW=X",
  },
  {
    id: "wti",
    name: "WTI 원유",
    shortName: "WTI",
    color: "#f59e0b",
  },
  {
    id: "us10y",
    name: "미국 10년물",
    shortName: "US10Y",
    color: "#8b5cf6",
    yahooSymbol: "^TNX",
  },
  {
    id: "sox",
    name: "반도체 SOX",
    shortName: "SOX",
    color: "#ef4444",
    yahooSymbol: "^SOX",
  },
  {
    id: "copper",
    name: "구리",
    shortName: "HG",
    color: "#d97706",
    yahooSymbol: "HG=F",
  },
  {
    id: "vix",
    name: "VIX",
    shortName: "VIX",
    color: "#64748b",
    yahooSymbol: "^VIX",
  },
] as const;

export type MacroQuote = {
  id: MacroId;
  value: number;
  /** Day change %. For us10y: absolute yield change in percentage points */
  changePct: number | null;
  history?: CandlePoint[];
};

export function emptyMacroQuote(id: MacroId): MacroQuote {
  return { id, value: 0, changePct: null };
}
