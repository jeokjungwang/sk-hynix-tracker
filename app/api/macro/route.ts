import { NextResponse } from "next/server";
import { fetchBybitJson } from "@/lib/bybitFetch";
import { fetchYahooChart } from "@/lib/yahooFinance";
import {
  MACRO_SERIES,
  type MacroId,
  type MacroQuote,
} from "@/lib/macro";

type BybitTickerResponse = {
  retCode?: number;
  result?: {
    list?: Array<{
      lastPrice?: string;
      prevPrice24h?: string;
      price24hPcnt?: string;
    }>;
  };
};

function toQuote(
  id: MacroId,
  price: number,
  previousClose: number,
  opts?: { absoluteChange?: boolean }
): MacroQuote {
  let changePct: number | null = null;
  if (previousClose > 0 && price > 0) {
    changePct = opts?.absoluteChange
      ? price - previousClose
      : ((price - previousClose) / previousClose) * 100;
  }
  return { id, value: price, changePct };
}

/**
 * Macro panel: USD/KRW, WTI, US10Y, SOX, Copper, VIX.
 */
export async function GET() {
  try {
    const yahooMetas = MACRO_SERIES.filter((m) => m.yahooSymbol);

    const [yahooResults, wtiYahoo, wtiBybit] = await Promise.all([
      Promise.all(
        yahooMetas.map(async (meta) => {
          try {
            const chart = await fetchYahooChart(
              meta.yahooSymbol!,
              meta.id === "dollar" ? "5m" : "1d",
              meta.id === "dollar" ? "5d" : "5d"
            );
            return { id: meta.id, chart };
          } catch (e) {
            console.error(`[/api/macro] Yahoo 실패 (${meta.yahooSymbol})`, e);
            return { id: meta.id, chart: null };
          }
        })
      ),
      fetchYahooChart("CL=F", "5m", "5d").catch(() => null),
      fetchBybitJson<BybitTickerResponse>(
        "https://api.bybit.com/v5/market/tickers?category=linear&symbol=CLUSDT"
      ).catch(() => null),
    ]);

    const byId = Object.fromEntries(
      yahooResults.map((row) => [row.id, row.chart])
    ) as Partial<
      Record<MacroId, Awaited<ReturnType<typeof fetchYahooChart>> | null>
    >;

    const quotes: Partial<Record<MacroId, MacroQuote>> = {};

    for (const meta of yahooMetas) {
      const chart = byId[meta.id];
      if (!chart || !(chart.price > 0)) continue;
      quotes[meta.id] = toQuote(
        meta.id,
        chart.price,
        chart.previousClose,
        { absoluteChange: meta.id === "us10y" }
      );
    }

    const bybitLast = parseFloat(
      wtiBybit?.result?.list?.[0]?.lastPrice ?? ""
    );
    const bybitPrev = parseFloat(
      wtiBybit?.result?.list?.[0]?.prevPrice24h ?? ""
    );
    const bybitPct = parseFloat(
      wtiBybit?.result?.list?.[0]?.price24hPcnt ?? ""
    );

    const wtiPrice =
      Number.isFinite(bybitLast) && bybitLast > 0
        ? bybitLast
        : wtiYahoo?.price ?? 0;
    const wtiPrev =
      Number.isFinite(bybitPrev) && bybitPrev > 0
        ? bybitPrev
        : wtiYahoo?.previousClose ?? 0;
    const wtiChangePct = Number.isFinite(bybitPct)
      ? bybitPct * 100
      : wtiPrev > 0
        ? ((wtiPrice - wtiPrev) / wtiPrev) * 100
        : null;

    quotes.wti = {
      id: "wti",
      value: wtiPrice,
      changePct: wtiChangePct,
    };

    return NextResponse.json({
      quotes,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("[/api/macro] 조회 실패", error);
    return NextResponse.json(
      { error: "매크로 지표 조회 실패" },
      { status: 502 }
    );
  }
}
