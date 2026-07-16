import axios from "axios";
import * as cheerio from "cheerio";

const NAVER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://finance.naver.com/",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const price = parseInt(cleaned, 10);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function extractBlindPrice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $: any,
  rootSelector: string
): number | null {
  const root = $(rootSelector);
  if (!root.length) return null;

  const fromToday = root.find("p.no_today span.blind").first().text().trim();
  const parsedToday = parsePrice(fromToday);
  if (parsedToday !== null) return parsedToday;

  const anyBlind = root.find("span.blind").first().text().trim();
  return parsePrice(anyBlind);
}

export type NaverSpotResult = {
  code: string;
  /** 정규장(KRX) 현재가 */
  krxPrice: number;
  /** 넥스트레이드(NXT) 현재가 — 없으면 null */
  nxtPrice: number | null;
  usedSelector: {
    krx: string;
    nxt: string | null;
  };
};

export async function fetchNaverSpotPrice(code: string): Promise<NaverSpotResult> {
  const url = `https://finance.naver.com/item/main.naver?code=${code}`;
  const { data } = await axios.get<string>(url, {
    headers: NAVER_HEADERS,
    timeout: 10000,
    responseType: "text",
  });

  const $ = cheerio.load(data);

  // Preferred: dedicated KRX / NXT panels on Naver Pay Securities
  let krxPrice = extractBlindPrice($, "#rate_info_krx");
  let krxSelector = "#rate_info_krx p.no_today span.blind";

  if (krxPrice === null) {
    const fallbacks = [
      "div.today em.no_today span.blind",
      "p.no_today span.blind",
      "div.today span.blind",
    ];
    for (const selector of fallbacks) {
      const text = $(selector).first().text().trim();
      const price = parsePrice(text);
      if (price !== null) {
        krxPrice = price;
        krxSelector = selector;
        break;
      }
    }
  }

  if (krxPrice === null) {
    const match = data.match(/현재가\s*([\d,]+)/);
    if (match?.[1]) {
      krxPrice = parsePrice(match[1]);
      krxSelector = "regex:현재가";
    }
  }

  if (krxPrice === null) {
    throw new Error(`KRX 현물 가격 파싱 실패 (${code})`);
  }

  const nxtPrice = extractBlindPrice($, "#rate_info_nxt");
  const nxtSelector =
    nxtPrice !== null ? "#rate_info_nxt p.no_today span.blind" : null;

  return {
    code,
    krxPrice,
    nxtPrice,
    usedSelector: {
      krx: krxSelector,
      nxt: nxtSelector,
    },
  };
}
