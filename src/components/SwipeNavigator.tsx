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
  const movedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    movedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      movedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!movedRef.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX.current;
    const diffY = endY - startY.current;

    if (Math.abs(diffX) < Math.abs(diffY)) return;
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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex flex-1 flex-col"
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}
