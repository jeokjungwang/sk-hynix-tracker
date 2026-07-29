import { NextResponse } from "next/server";
import { fetchBybitJson } from "@/lib/bybitFetch";
import { fetchUsGdpBillions, fetchYahooChart } from "@/lib/yahooFinance";

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

/**
 * Macro panel: USD/KRW (Yahoo), WTI (Bybit CLUSDT), Buffett (Wilshire/GDP).
 */
export async function GET() {
  try {
    const [usdKrw, wtiYahoo, wilshire, gdpBillions, wtiBybit] =
      await Promise.all([
        fetchYahooChart("USDKRW=X", "5m", "5d"),
        fetchYahooChart("CL=F", "5m", "5d").catch(() => null),
        fetchYahooChart("^W5000", "1d", "3mo"),
        fetchUsGdpBillions(),
        fetchBybitJson<BybitTickerResponse>(
          "https://api.bybit.com/v5/market/tickers?category=linear&symbol=CLUSDT"
        ).catch(() => null),
      ]);

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
    const wtiChangePct =
      Number.isFinite(bybitPct)
        ? bybitPct * 100
        : wtiPrev > 0
          ? ((wtiPrice - wtiPrev) / wtiPrev) * 100
          : null;

    const usdKrwChangePct =
      usdKrw.previousClose > 0
        ? ((usdKrw.price - usdKrw.previousClose) / usdKrw.previousClose) * 100
        : null;

    const buffett =
      gdpBillions > 0 && wilshire.price > 0
        ? (wilshire.price / gdpBillions) * 100
        : 0;

    const buffettPrev =
      gdpBillions > 0 && wilshire.previousClose > 0
        ? (wilshire.previousClose / gdpBillions) * 100
        : 0;

    const buffettChangePct =
      buffettPrev > 0 ? ((buffett - buffettPrev) / buffettPrev) * 100 : null;

    const buffettHistory = wilshire.bars.map((bar) => ({
      time: bar.time,
      open: (bar.open / gdpBillions) * 100,
      high: (bar.high / gdpBillions) * 100,
      low: (bar.low / gdpBillions) * 100,
      close: (bar.close / gdpBillions) * 100,
    }));

    return NextResponse.json({
      dollar: {
        id: "dollar",
        value: usdKrw.price,
        changePct: usdKrwChangePct,
        history: usdKrw.bars,
      },
      wti: {
        id: "wti",
        value: wtiPrice,
        changePct: wtiChangePct,
        history: wtiYahoo?.bars ?? [],
      },
      buffett: {
        id: "buffett",
        value: buffett,
        changePct: buffettChangePct,
        history: buffettHistory,
        gdpBillions,
        wilshire: wilshire.price,
      },
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
