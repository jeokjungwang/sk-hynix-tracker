"use client";

import type { ReactNode } from "react";

/** Page-width shell — page scrolls as one column so ads aren't clipped mid-viewport. */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl">{children}</div>;
}
