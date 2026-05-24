"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CircleDollarSign } from "lucide-react";

const tabs = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/citas", label: "Citas", Icon: Calendar },
  { href: "/finanzas", label: "Finanzas", Icon: CircleDollarSign },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E5E5] bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around pb-2 pt-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-transform active:scale-90 ${
                active ? "text-primary" : "text-gray-400"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
