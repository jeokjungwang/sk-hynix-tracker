"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type FitScaleProps = {
  children: ReactNode;
  /** Fixed design canvas width (px). Layout is authored at this width. */
  designWidth?: number;
  /** Never scale larger than this (1 = design size). */
  maxScale?: number;
};

/**
 * Renders children at a fixed design width, then scales the whole tree
 * down so both width and height fit the viewport — for broadcast / OBS use.
 */
export default function FitScale({
  children,
  designWidth = 1280,
  maxScale = 1,
}: FitScaleProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const naturalHeight = inner.offsetHeight;
      const availW = outer.clientWidth;
      const availH = outer.clientHeight;
      if (naturalHeight <= 0 || availW <= 0 || availH <= 0) return;

      const next = Math.min(
        maxScale,
        availW / designWidth,
        availH / naturalHeight,
      );

      setScale(next);
      setContentHeight(naturalHeight);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [designWidth, maxScale]);

  return (
    <div
      ref={outerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: designWidth * scale,
          height: contentHeight > 0 ? contentHeight * scale : undefined,
        }}
      >
        <div
          ref={innerRef}
          className="origin-top-left"
          style={{
            width: designWidth,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
