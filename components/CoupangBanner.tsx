"use client";

/**
 * Coupang Partners carousel (320×100).
 * Shown only on mobile/stacked layout between Samsung and Hynix cards.
 */
export default function CoupangBanner() {
  const src =
    "https://ads-partners.coupang.com/widgets.html?id=1011784&template=carousel&trackingCode=AF8692024&width=320&height=100&tsource=";

  return (
    <aside
      className="flex w-full shrink-0 flex-col items-center justify-center gap-1 py-1 lg:hidden"
      aria-label="쿠팡 파트너스 광고"
    >
      <div className="flex h-[100px] w-[320px] max-w-full items-center justify-center overflow-hidden">
        <iframe
          src={src}
          width={320}
          height={100}
          title="쿠팡 파트너스"
          frameBorder={0}
          scrolling="no"
          referrerPolicy="unsafe-url"
          className="h-[100px] w-[320px] max-w-full border-0"
        />
      </div>
      <p className="px-2 text-center text-[11px] font-medium leading-snug text-[color:var(--muted)]">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
        제공받습니다.
      </p>
    </aside>
  );
}
