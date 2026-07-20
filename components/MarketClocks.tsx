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
      <div className="flex items-baseline justify-end gap-2">
        <span
          className={`text-[2rem] font-bold leading-none tracking-tight ${
            emphasize ? "text-sky-300" : "text-slate-300"
          }`}
        >
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-500">{zone}</span>
      </div>
      <p
        className={`mt-1.5 font-mono text-[2rem] font-bold leading-none tracking-tight tabular-nums ${
          emphasize ? "text-white" : "text-slate-100"
        }`}
      >
        {time}
      </p>
      <p className="mt-1.5 text-sm text-slate-500">{day}</p>
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
      <div className="h-[108px] w-[320px] shrink-0 rounded-xl border border-slate-800/80 bg-slate-950/50" />
    );
  }

  return (
    <div className="shrink-0 rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
      <div className="flex items-stretch gap-5">
        <ClockRow
          label="한국"
          zone="KST"
          time={korea.time}
          day={korea.day}
          emphasize
        />
        <div className="w-px self-stretch bg-slate-800" />
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
