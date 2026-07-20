"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Company logo.
 *  - variant="mark" → /logo.png       (calligraphy mark, used in sidebar/header)
 *  - variant="full" → /logo-full.png  (full lockup with name, used on login)
 *
 * The source images have a white background, so the image sits on a white
 * rounded chip. This guarantees the navy/teal artwork stays clearly legible in
 * BOTH light and dark mode, and it preserves the original aspect ratio (height
 * is fixed, width scales automatically via object-contain).
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
  const src = variant === "full" ? "/logo-full.png" : "/logo.png";
  // Intrinsic aspect ratios (mark ≈ 1.24:1, full ≈ 0.95:1) keep next/image happy.
  const ratio = variant === "full" ? { w: 96, h: 100 } : { w: 124, h: 100 };

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
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
          style={{ padding: Math.round(size * 0.08) }}
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
