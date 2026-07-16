export type ExchangeRateResult = {
  usdKrw: number;
  updatedAt: Date;
};

/**
 * Fetch USD → KRW rate from ExchangeRate-API.
 * Uses NEXT_PUBLIC_EXCHANGE_RATE_API_KEY when set; otherwise falls back
 * to the public open.er-api.com endpoint.
 */
export async function fetchUsdKrwRate(): Promise<ExchangeRateResult> {
  const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY?.trim();
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    : "https://open.er-api.com/v6/latest/USD";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`환율 API 요청 실패 (${res.status})`);
  }

  const data = (await res.json()) as { 
    result?: string;
    conversion_rates?: { KRW: number };
    "error-type"?: string; // 에러 메시지 확인용
  };
  console.log("API 응답 데이터:", data);

  const usdKrw = data.conversion_rates?.KRW;
  if (typeof usdKrw !== "number" || !Number.isFinite(usdKrw) || usdKrw <= 0) {
    throw new Error("유효한 KRW 환율을 받지 못했습니다");
  }

  return { usdKrw, updatedAt: new Date() };
}
