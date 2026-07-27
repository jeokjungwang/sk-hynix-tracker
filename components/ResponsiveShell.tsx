"use client";

import type { ReactNode } from "react";

/** Full-size scrollable shell — charts keep fixed height and stay visible. */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-full w-full min-h-0 overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
