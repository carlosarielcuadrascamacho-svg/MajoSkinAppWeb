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

function transaccionEnMes(t: Transaccion, mes: Date): boolean {
  if (!t.creadoEn?.seconds) return false;
  const fecha = new Date(t.creadoEn.seconds * 1000);
  return (
    fecha.getMonth() === mes.getMonth() &&
    fecha.getFullYear() === mes.getFullYear()
  );
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
  const [mesActual, setMesActual] = useState(() => new Date());
  const { showToast } = useToast();

  const handleEliminar = async () => {
    if (!eliminando) return;
    try {
      await deleteDoc(doc(db, "transacciones", eliminando.id));
      showToast("Transacción eliminada", "success");
    } catch {
      showToast("Error al eliminar la transacción", "error");
    }
    setEliminando(null);
  };

  const abrirEditar = (t: Transaccion) => {
    setEditando(t);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditando(null);
  };

  const filtradas = transacciones.filter((t) =>
    transaccionEnMes(t, mesActual)
  );

  const ingresos = filtradas
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);

  const gastos = filtradas
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.monto, 0);

  const balance = ingresos - gastos;

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

  const cambiarMes = (delta: number) => {
    setMesActual((prev) => {
      const nuevo = new Date(prev);
      nuevo.setMonth(nuevo.getMonth() + delta);
      return nuevo;
    });
  };

  const nombreMes = mesActual.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

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

            <div className="mt-6 mb-4 flex items-center justify-center gap-4">
              <button
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
              <p className="text-sm font-medium capitalize text-foreground">
                {nombreMes}
              </p>
              <button
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
              >
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {filtradas.length === 0 ? (
              <div className="mt-10 flex flex-col items-center gap-3">
                <Wallet className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Sin movimientos en {nombreMes}
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
                        aria-label="Eliminar transacción"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90"
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
        onClose={() => setEliminando(null)}
        onConfirm={handleEliminar}
        title="Eliminar transacción"
        message={`¿Eliminar "${eliminando?.descripcion ?? ""}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
