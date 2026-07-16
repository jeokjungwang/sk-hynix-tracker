import { NextResponse } from "next/server";
import { fetchNaverSpotPrice } from "@/lib/naverStock";

/** Legacy endpoint — prefer `/api/stock?code=000660` */
export async function GET() {
  try {
    const { krxPrice, nxtPrice, usedSelector } =
      await fetchNaverSpotPrice("000660");
    console.log("[/api/hynix] 현물가 조회 성공", {
      krxPrice,
      nxtPrice,
      usedSelector,
    });
    return NextResponse.json({
      price: krxPrice,
      krxPrice,
      nxtPrice,
    });
  } catch (error) {
    console.error("[/api/hynix] 현물 가격 조회 실패", error);
    return NextResponse.json(
      {
        error: "현물 가격 조회 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
