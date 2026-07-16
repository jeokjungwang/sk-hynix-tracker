import { NextRequest, NextResponse } from "next/server";
import { fetchNaverSpotPrice } from "@/lib/naverStock";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() || "000660";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "유효하지 않은 종목 코드입니다.", code },
      { status: 400 }
    );
  }

  try {
    const { krxPrice, nxtPrice, usedSelector } = await fetchNaverSpotPrice(code);

    console.log("[/api/stock] 현물가 조회 성공", {
      code,
      krxPrice,
      nxtPrice,
      usedSelector,
    });

    return NextResponse.json({
      code,
      /** @deprecated use krxPrice / nxtPrice */
      price: krxPrice,
      krxPrice,
      nxtPrice,
      usedSelector,
    });
  } catch (error) {
    console.error("[/api/stock] 현물 가격 조회 실패", { code, error });
    return NextResponse.json(
      {
        error: "현물 가격 조회 실패",
        code,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
