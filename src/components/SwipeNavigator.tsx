"use client";

import { useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const RUTAS = ["/", "/citas", "/finanzas"];
const THRESHOLD = 50;

export default function SwipeNavigator({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX.current;
    const diffY = endY - startY.current;

    if (Math.abs(diffX) < Math.abs(diffY) * 1.5) return;
    if (Math.abs(diffX) < THRESHOLD) return;

    const idx = RUTAS.indexOf(pathname);
    if (idx === -1) return;

    if (diffX > 0 && idx > 0) {
      router.push(RUTAS[idx - 1]);
    } else if (diffX < 0 && idx < RUTAS.length - 1) {
      router.push(RUTAS[idx + 1]);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-1 flex-col"
    >
      {children}
    </div>
  );
}
