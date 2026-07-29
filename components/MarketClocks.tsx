"use client";

import { useEffect, useState } from "react";

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

function formatClock(date: Date, timeZone: string) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  const day = new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);

  return { time, day };
}

function ClockRow({
  label,
  zone,
  time,
  day,
}: {
  label: string;
  zone: string;
  time: string;
  day: string;
}) {
  return (
    <div className="min-w-0 text-right">
      <p className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-[12px] font-medium text-[color:var(--label)]">
        <span className="font-semibold text-[color:var(--foreground)]">
          {label}
        </span>
        <span>{zone}</span>
        <span className="text-[color:var(--muted)]">·</span>
        <span>{day}</span>
      </p>
      <p className="toss-price mt-0.5 text-[1.25rem] leading-none text-[color:var(--foreground)] sm:text-[1.35rem]">
        {time}
      </p>
    </div>
  );
}

export default function MarketClocks() {
  const now = useNow();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const korea = formatClock(now, "Asia/Seoul");
  const usEast = formatClock(now, "America/New_York");

  if (!mounted) {
    return (
      <div className="toss-card h-[64px] w-[280px] max-w-full shrink-0" />
    );
  }

  return (
    <div className="toss-card shrink-0 px-3.5 py-2.5">
      <div className="flex items-center gap-4">
        <ClockRow
          label="한국"
          zone="KST"
          time={korea.time}
          day={korea.day}
        />
        <div className="h-8 w-px shrink-0 bg-[color:var(--border)]" />
        <ClockRow
          label="미국 동부"
          zone="ET"
          time={usEast.time}
          day={usEast.day}
        />
      </div>
    </div>
  );
}
