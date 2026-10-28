"use client";

import Image from "next/image";

/**
 * Centered One Loop Social logo on midnight — used wherever the post image
 * is still the solid placeholder (no empty black rectangles).
 */
export default function PlaceholderBrandOverlay({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm"
      ? "h-8 w-auto max-w-[70%]"
      : size === "lg"
        ? "h-16 w-auto max-w-[75%] md:h-20"
        : "h-12 w-auto max-w-[72%] md:h-16";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#070B19]"
      aria-hidden
    >
      <Image
        src="/logo.png"
        alt="One Loop Social"
        width={280}
        height={96}
        className={`${box} select-none object-contain opacity-95`}
        priority
        unoptimized
      />
    </div>
  );
}

/** True when the store is still showing the solid midnight placeholder. */
export function isBrandPlaceholder(src: string | null | undefined): boolean {
  if (!src) return true;
  if (src.includes("fill%3D%22%23070B19%22") || src.includes('fill="#070B19"')) {
    return true;
  }
  if (src.includes("%23070B19") || src.includes("#070B19")) return true;
  return false;
}
