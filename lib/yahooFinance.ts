import type { CandlePoint } from "@/lib/candles";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        symbol?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
};

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchYahooChart(
  symbol: string,
  interval: string,
  range: string
): Promise<{
  price: number;
  previousClose: number;
  bars: CandlePoint[];
}> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": YAHOO_UA,
      Accept: "application/json",
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo chart 실패 (${symbol}): ${res.status}`);
  }

  const json = (await res.json()) as YahooChartResponse;
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`Yahoo chart 데이터 없음 (${symbol})`);
  }

  const price = result.meta?.regularMarketPrice ?? 0;
  const previousClose =
    result.meta?.previousClose ??
    result.meta?.chartPreviousClose ??
    0;

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  const bars: CandlePoint[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote?.open?.[i];
    const high = quote?.high?.[i];
    const low = quote?.low?.[i];
    const close = quote?.close?.[i];
    if (
      !timestamps[i] ||
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !(open > 0 && high > 0 && low > 0 && close > 0)
    ) {
      continue;
    }
    bars.push({
      time: timestamps[i]!,
      open,
      high,
      low,
      close,
    });
  }

  return { price, previousClose, bars };
}
