type BybitFetchInit = RequestInit & {
  next?: { revalidate: number };
};

/**
 * Direct Bybit public REST fetch (browser-like headers).
 */
export async function fetchBybitJson<T = unknown>(
  bybitUrl: string
): Promise<T> {
  const init: BybitFetchInit = {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    next: { revalidate: 10 },
  };

  const response = await fetch(bybitUrl, init);

  if (!response.ok) {
    throw new Error(`Bybit API 요청 실패: ${response.status}`);
  }

  return (await response.json()) as T;
}
