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
  emphasize,
}: {
  label: string;
  zone: string;
  time: string;
  day: string;
  emphasize?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="flex items-baseline justify-end gap-1.5">
        <span
          className={`text-lg font-bold tracking-tight ${
            emphasize ? "toss-accent" : "text-[color:var(--foreground)]"
          }`}
        >
          {label}
        </span>
        <span className="toss-label text-[11px]">{zone}</span>
      </div>
      <p
        className={`toss-price mt-1.5 text-[1.75rem] leading-none ${
          emphasize ? "toss-accent" : ""
        }`}
      >
        {time}
      </p>
      <p className="toss-label mt-1.5 text-[12px]">{day}</p>
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
      <div className="toss-card h-[108px] w-[300px] max-w-full shrink-0" />
    );
  }

  return (
    <div className="toss-card shrink-0 px-4 py-3.5">
      <div className="flex items-stretch gap-5">
        <ClockRow
          label="한국"
          zone="KST"
          time={korea.time}
          day={korea.day}
          emphasize
        />
        <div className="w-px self-stretch bg-[color:var(--border)]" />
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
