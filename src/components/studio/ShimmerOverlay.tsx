export default function ShimmerOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
      <div className="studio-shimmer absolute inset-0" />
    </div>
  );
}
