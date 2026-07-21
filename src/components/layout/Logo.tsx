"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Company logo.
 *  - variant="mark" → /logo.png       (white-background calligraphy mark, sidebar/header)
 *  - variant="full" → /logo-full.png  (dark-background full lockup with name, login)
 *
 * The two source images have different backgrounds, so they're framed
 * differently: the white-background mark sits on a white chip (so it reads
 * cleanly in dark mode too), while the dark-background full lockup is shown as a
 * self-contained rounded emblem with no chip. Height is fixed and width scales
 * automatically (object-contain), preserving each image's aspect ratio.
 */
export function Logo({
  size = 36,
  withText = true,
  variant = "mark",
  className,
}: {
  size?: number;
  withText?: boolean;
  variant?: "mark" | "full";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isFull = variant === "full";
  const src = isFull ? "/logo-full.png" : "/logo.png";
  // Intrinsic aspect ratios: mark ≈ 1.79:1 (2752×1536), full = 1:1 (1024×1024).
  const ratio = isFull ? { w: 100, h: 100 } : { w: 179, h: 100 };

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
      ) : (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden",
            isFull
              ? "rounded-2xl ring-1 ring-white/10"
              : "rounded-lg bg-white ring-1 ring-black/5"
          )}
          style={{ padding: isFull ? 0 : Math.round(size * 0.08) }}
        >
          <Image
            src={src}
            alt="Wadi Al Buraq Tourism"
            width={ratio.w}
            height={ratio.h}
            className="object-contain"
            style={{ height: size, width: "auto" }}
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
