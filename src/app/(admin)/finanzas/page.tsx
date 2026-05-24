"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Wallet, Trash2 } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import TransaccionModal from "@/components/TransaccionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/context/ToastContext";

interface Transaccion {
  id: string;
  tipo: "ingreso" | "gasto";
  descripcion: string;
  monto: number;
}

export default function FinanzasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Transaccion | null>(null);
  const [eliminando, setEliminando] = useState<Transaccion | null>(null);
  const { showToast } = useToast();

  const cargarTransacciones = useCallback(async () => {
    setLoading(true);
    const q = query(
      collection(db, "transacciones"),
      orderBy("creadoEn", "desc")
    );
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaccion[];
    setTransacciones(lista);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarTransacciones();
  }, [cargarTransacciones]);

  const handleEliminar = async () => {
    if (!eliminando) return;
    try {
      await deleteDoc(doc(db, "transacciones", eliminando.id));
      showToast("Transacción eliminada", "success");
      cargarTransacciones();
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

  const ingresos = transacciones
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);

  const gastos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.monto, 0);

  const balance = ingresos - gastos;

  const formatearMonto = (monto: number) =>
    `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

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

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex-1 px-6 pt-8">
        <h1 className="mb-6 font-serif text-3xl font-bold tracking-tight">
          Finanzas
        </h1>

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

            {transacciones.length === 0 ? (
              <div className="mt-20 flex flex-col items-center gap-3">
                <Wallet className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No hay movimientos registrados
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2 pb-4">
                {transacciones.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => abrirEditar(t)}
                    className="relative flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.98]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEliminando(t);
                      }}
                      className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger transition-transform active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t.descripcion}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {t.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        t.tipo === "ingreso" ? "text-success" : "text-danger"
                      }`}
                    >
                      {t.tipo === "ingreso" ? "+" : "-"}
                      {formatearMonto(t.monto)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-90"
      >
        <Plus className="h-7 w-7" />
      </button>

      <TransaccionModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onTransaccionAgregada={cargarTransacciones}
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
