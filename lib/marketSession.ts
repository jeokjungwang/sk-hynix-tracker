export type SpotSource = "KRX" | "NXT";

/** Display label on badges — may note missing NXT data */
export type SpotLabel = "KRX" | "NXT" | "NXT(데이터없음)";

export type SpotPickResult = {
  price: number;
  /** Logical market venue for the session */
  source: SpotSource;
  /** UI badge text */
  label: SpotLabel;
  /** True when NXT session but showing last KRX close */
  usingFallback: boolean;
};

/** Korea (Asia/Seoul) minutes since midnight */
export function getSeoulMinutesNow(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * 09:00 ~ 15:30 → KRX
 * before 09:00 or after 15:30 → NXT
 */
export function resolveSpotSource(date = new Date()): SpotSource {
  const minutes = getSeoulMinutesNow(date);
  const open = 9 * 60;
  const close = 15 * 60 + 30;
  return minutes >= open && minutes <= close ? "KRX" : "NXT";
}

export function pickSpotPrice(
  krxPrice: number,
  nxtPrice: number | null,
  preferred: SpotSource
): SpotPickResult {
  if (preferred === "NXT") {
    if (nxtPrice !== null && nxtPrice > 0) {
      return {
        price: nxtPrice,
        source: "NXT",
        label: "NXT",
        usingFallback: false,
      };
    }
    // Keep last KRX close; label tells user NXT is unavailable
    return {
      price: krxPrice > 0 ? krxPrice : 0,
      source: "NXT",
      label: "NXT(데이터없음)",
      usingFallback: true,
    };
  }

  return {
    price: krxPrice,
    source: "KRX",
    label: "KRX",
    usingFallback: false,
  };
}
