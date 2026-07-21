"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Company logo.
 *  - variant="mark" → /logo.png       (white-bg calligraphy mark, sidebar/header)
 *  - variant="full" → /logo-full.png  (dark-bg full lockup with name, login)
 *
 * The mark sits in a SQUARE white chip and is zoomed with object-cover so the
 * artwork fills the frame (the source has wide margins). The dark full lockup
 * renders as a self-contained rounded emblem with no chip. Aspect ratios are
 * preserved per variant.
 */
export function Logo({
  size = 36,
  withText = true,
  variant = "mark",
  zoom = 1,
  className,
}: {
  size?: number;
  withText?: boolean;
  variant?: "mark" | "full";
  zoom?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isFull = variant === "full";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {failed ? (
        <div
          className="flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#14477d] to-[#17847b] font-bold text-white"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
          aria-hidden
        >
          WB
        </div>
      ) : isFull ? (
        // Dark-background full lockup — chip-less rounded emblem (1:1 source)
        <span
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/10"
        >
          <Image
            src="/logo-full.png"
            alt="Wadi Al Buraq Tourism"
            width={100}
            height={100}
            className="object-contain"
            style={{ height: size, width: "auto" }}
            onError={() => setFailed(true)}
            priority
          />
        </span>
      ) : (
        // White-background mark — square chip, zoomed to fill
        <span
          className="relative shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo.png"
            alt="Wadi Al Buraq Tourism"
            fill
            sizes={`${size}px`}
            className="object-contain"
            style={zoom !== 1 ? { transform: `scale(${zoom})` } : undefined}
            onError={() => setFailed(true)}
            priority
          />
        </span>
      )}
      {withText && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-extrabold tracking-wide text-fg">WADI AL BURAQ</p>
          <p className="truncate text-[10px] font-semibold tracking-[0.22em] text-accent">TOURISM L.L.C</p>
        </div>
      )}
    </div>
  );
}
