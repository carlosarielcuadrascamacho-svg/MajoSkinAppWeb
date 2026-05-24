export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl bg-gray-200 ${className ?? ""}`}
    />
  );
}
