"use client";

import { useState } from "react";
import {
  Plus,
  Wallet,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTransacciones } from "@/hooks/useTransacciones";
import TransaccionModal from "@/components/TransaccionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import OfflineIndicator from "@/components/OfflineIndicator";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/context/ToastContext";
import { formatearMonto } from "@/lib/utils";
import { descargarCSV } from "@/lib/csv";
import type { Transaccion } from "@/types/transaccion";

type Vista = "dia" | "semana" | "mes" | "año";

function inicioSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia; // Lunes como inicio
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finSemana(fecha: Date): Date {
  const d = inicioSemana(fecha);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function transaccionEnVista(t: Transaccion, vista: Vista, enfoque: Date): boolean {
  if (!t.creadoEn?.seconds) return false;
  const fecha = new Date(t.creadoEn.seconds * 1000);

  if (vista === "dia") {
    return (
      fecha.getDate() === enfoque.getDate() &&
      fecha.getMonth() === enfoque.getMonth() &&
      fecha.getFullYear() === enfoque.getFullYear()
    );
  }

  if (vista === "semana") {
    const inicio = inicioSemana(enfoque);
    const fin = finSemana(enfoque);
    return fecha >= inicio && fecha <= fin;
  }

  if (vista === "año") {
    return fecha.getFullYear() === enfoque.getFullYear();
  }

  // mes
  return (
    fecha.getMonth() === enfoque.getMonth() &&
    fecha.getFullYear() === enfoque.getFullYear()
  );
}

function navegar(vista: Vista, enfoque: Date, delta: number): Date {
  const d = new Date(enfoque);
  if (vista === "dia") d.setDate(d.getDate() + delta);
  else if (vista === "semana") d.setDate(d.getDate() + delta * 7);
  else if (vista === "mes") d.setMonth(d.getMonth() + delta);
  else d.setFullYear(d.getFullYear() + delta);
  return d;
}

function tituloVista(vista: Vista, enfoque: Date): string {
  if (vista === "dia") {
    return enfoque.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (vista === "semana") {
    const inicio = inicioSemana(enfoque);
    const fin = finSemana(enfoque);
    const iniStr = inicio.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    const finStr = fin.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    return `${iniStr} – ${finStr}`;
  }
  if (vista === "año") {
    return String(enfoque.getFullYear());
  }
  return enfoque.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function exportarTransacciones(transacciones: Transaccion[]) {
  descargarCSV(
    `finanzas-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Tipo", "Descripción", "Monto", "Fecha"],
    transacciones.map((t) => [
      t.tipo === "ingreso" ? "Ingreso" : "Gasto",
      t.descripcion,
      t.monto,
      t.creadoEn?.seconds
        ? new Date(t.creadoEn.seconds * 1000).toISOString()
        : "",
    ])
  );
}

export default function FinanzasPage() {
  const { transacciones, loading } = useTransacciones();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<Transaccion | null>(null);
  const [eliminando, setEliminando] = useState<Transaccion | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("mes");
  const [enfoque, setEnfoque] = useState(() => new Date());
  const { showToast } = useToast();

  const handleEliminar = async () => {
    if (!eliminando) return;
    setEliminandoId(eliminando.id);
    try {
      await deleteDoc(doc(db, "transacciones", eliminando.id));
      showToast("Transacción eliminada", "success");
    } catch {
      showToast("Error al eliminar la transacción", "error");
    }
    setEliminando(null);
    setEliminandoId(null);
  };

  const abrirEditar = (t: Transaccion) => {
    setEditando(t);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditando(null);
  };

  const navegarVista = (delta: number) => {
    setEnfoque((prev) => navegar(vista, prev, delta));
  };

  const filtradas = transacciones.filter((t) =>
    transaccionEnVista(t, vista, enfoque)
  );

  const ingresos = filtradas
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);

  const gastos = filtradas
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.monto, 0);

  const balance = ingresos - gastos;

  // 1. Calcular totales por categoría para Ingresos
  const categoriasIngresos: Record<string, number> = {
    "Servicios": 0,
    "Venta de Productos": 0,
    "Otros": 0,
  };
  filtradas
    .filter((t) => t.tipo === "ingreso")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      if (categoriasIngresos[cat] !== undefined) {
        categoriasIngresos[cat] += t.monto;
      } else {
        categoriasIngresos["Otros"] += t.monto;
      }
    });

  // 2. Calcular totales por categoría para Gastos
  const categoriasGastos: Record<string, number> = {
    "Insumos y Materiales": 0,
    "Renta y Servicios": 0,
    "Publicidad": 0,
    "Capacitación": 0,
    "Otros": 0,
  };
  filtradas
    .filter((t) => t.tipo === "gasto")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      if (categoriasGastos[cat] !== undefined) {
        categoriasGastos[cat] += t.monto;
      } else {
        categoriasGastos["Otros"] += t.monto;
      }
    });

  const resumen = [
    {
      label: "Ingresos",
      value: formatearMonto(ingresos),
      textColor: "text-success",
    },
    {
      label: "Gastos",
      value: formatearMonto(gastos),
      textColor: "text-danger",
    },
    {
      label: "Balance",
      value: formatearMonto(balance),
      textColor: balance >= 0 ? "text-success" : "text-danger",
    },
  ];

  const VISTAS: { key: Vista; label: string }[] = [
    { key: "dia", label: "Día" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mes" },
    { key: "año", label: "Año" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background">
      <OfflineIndicator />

      <div className="flex-1 px-6 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Finanzas
          </h1>
          {transacciones.length > 0 && (
            <button
              onClick={() => exportarTransacciones(transacciones)}
              aria-label="Exportar finanzas a CSV"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
            >
              <Download className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {resumen.map(({ label, value, textColor }) => (
                <div
                  key={label}
                  className="rounded-3xl bg-white px-3 py-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                >
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`mt-1 text-sm font-bold ${textColor}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 mb-3 flex rounded-full bg-white p-1 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              {VISTAS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    setVista(v.key);
                    setEnfoque(new Date());
                  }}
                  className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
                    vista === v.key
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-400 active:scale-95"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-center gap-4">
              <button
                onClick={() => navegarVista(-1)}
                aria-label="Anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
              <p className="text-center text-sm font-medium capitalize text-foreground">
                {tituloVista(vista, enfoque)}
              </p>
              <button
                onClick={() => navegarVista(1)}
                aria-label="Siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
              >
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Desglose por categorías premium */}
            {filtradas.length > 0 && (
              <div className="mb-6 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#FAFAFA]">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Desglose por Categorías
                </p>
                <div className="flex flex-col gap-5">
                  {/* Ingresos */}
                  {ingresos > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-success uppercase tracking-wider">Ingresos</span>
                        <span className="text-xs text-success font-semibold">{formatearMonto(ingresos)}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {Object.entries(categoriasIngresos).map(([cat, monto]) => {
                          if (monto === 0) return null;
                          const porcentaje = Math.round((monto / ingresos) * 100);
                          return (
                            <div key={cat} className="text-xs">
                              <div className="flex justify-between text-gray-500 mb-1 font-medium">
                                <span>{cat}</span>
                                <span>{porcentaje}% ({formatearMonto(monto)})</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-success h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${porcentaje}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gastos */}
                  {gastos > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-danger uppercase tracking-wider">Gastos</span>
                        <span className="text-xs text-danger font-semibold">{formatearMonto(gastos)}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {Object.entries(categoriasGastos).map(([cat, monto]) => {
                          if (monto === 0) return null;
                          const porcentaje = Math.round((monto / gastos) * 100);
                          return (
                            <div key={cat} className="text-xs">
                              <div className="flex justify-between text-gray-500 mb-1 font-medium">
                                <span>{cat}</span>
                                <span>{porcentaje}% ({formatearMonto(monto)})</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-danger h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${porcentaje}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {filtradas.length === 0 ? (
              <div className="mt-10 flex flex-col items-center gap-3">
                <Wallet className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Sin movimientos en {vista === "año" ? enfoque.getFullYear() : tituloVista(vista, enfoque)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-4">
                {filtradas.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => abrirEditar(t)}
                    className="flex items-start justify-between rounded-3xl bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t.descripcion}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {t.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          t.tipo === "ingreso" ? "text-success" : "text-danger"
                        }`}
                      >
                        {t.tipo === "ingreso" ? "+" : "-"}
                        {formatearMonto(t.monto)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEliminando(t);
                        }}
                        disabled={eliminandoId === t.id}
                        aria-label="Eliminar transacción"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        aria-label="Nueva transacción"
        className="fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all active:scale-90 active:shadow-xl"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Plus className="h-7 w-7" />
      </button>

      <TransaccionModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        transaccionEditando={editando}
      />

      <ConfirmDialog
        isOpen={!!eliminando}
        onClose={() => {
          if (!eliminandoId) setEliminando(null);
        }}
        onConfirm={handleEliminar}
        title="Eliminar transacción"
        message={`¿Eliminar "${eliminando?.descripcion ?? ""}"? Esta acción no se puede deshacer.`}
        loading={!!eliminandoId}
      />
    </div>
  );
}
