"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Skeleton from "@/components/Skeleton";

export default function Dashboard() {
  const [citasCount, setCitasCount] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargarResumen = useCallback(async () => {
    try {
      const [citasSnap, transaccionesSnap] = await Promise.all([
        getDocs(collection(db, "citas")),
        getDocs(collection(db, "transacciones")),
      ]);

      setCitasCount(citasSnap.size);

      let totalIngresos = 0;
      let totalGastos = 0;
      transaccionesSnap.docs.forEach((d) => {
        const monto = d.data().monto || 0;
        if (d.data().tipo === "ingreso") totalIngresos += monto;
        else totalGastos += monto;
      });

      setIngresos(totalIngresos);
      setGastos(totalGastos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const formatearMonto = (monto: number) =>
    `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const balance = ingresos - gastos;

  const cards = [
    {
      label: "Próximas Citas",
      value: loading ? null : `${citasCount} pendientes`,
      icon: Calendar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Ingresos del Mes",
      value: loading ? null : formatearMonto(ingresos),
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Balance Total",
      value: loading ? null : formatearMonto(balance),
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: balance >= 0 ? "text-success" : "text-danger",
    },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background px-6 pt-8">
      <h1 className="mb-1 font-serif text-3xl font-bold tracking-tight">
        Inicio
      </h1>
      <p className="mb-6 text-sm text-gray-400">Bienvenida a MajoAdmin</p>

      <div className="flex flex-col gap-4">
        {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-3xl bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.98]"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <p className="text-lg font-semibold text-foreground">
                  {value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => signOut(auth)}
          className="rounded-full bg-danger/10 px-6 py-2 text-sm font-medium text-danger transition-transform active:scale-95"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
