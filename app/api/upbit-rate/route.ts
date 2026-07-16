import { NextResponse } from "next/server";

const UPBIT_URL = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";

export async function GET() {
  try {
    const res = await fetch(UPBIT_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[/api/upbit-rate] Upbit 응답 오류", res.status);
      return NextResponse.json(
        { error: "업비트 환율 조회 실패" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{ trade_price?: number }>;
    const tradePrice = data?.[0]?.trade_price;

    if (typeof tradePrice !== "number" || !Number.isFinite(tradePrice) || tradePrice <= 0) {
      console.error("[/api/upbit-rate] trade_price 파싱 실패", data);
      return NextResponse.json(
        { error: "업비트 환율 파싱 실패" },
        { status: 502 }
      );
    }

    return NextResponse.json({ trade_price: tradePrice });
  } catch (error) {
    console.error("[/api/upbit-rate] 업비트 환율 조회 실패", error);
    return NextResponse.json(
      {
        error: "업비트 환율 조회 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
