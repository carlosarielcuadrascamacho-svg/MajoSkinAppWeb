"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

interface TransaccionEdit {
  id: string;
  tipo: "ingreso" | "gasto";
  descripcion: string;
  monto: number;
}

interface TransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransaccionAgregada: () => void;
  transaccionEditando?: TransaccionEdit | null;
}

export default function TransaccionModal({
  isOpen,
  onClose,
  onTransaccionAgregada,
  transaccionEditando,
}: TransaccionModalProps) {
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (transaccionEditando) {
      setTipo(transaccionEditando.tipo);
      setDescripcion(transaccionEditando.descripcion);
      setMonto(String(transaccionEditando.monto));
    } else {
      setTipo("ingreso");
      setDescripcion("");
      setMonto("");
    }
  }, [transaccionEditando, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const data = {
        tipo,
        descripcion,
        monto: Number(monto),
      };

      if (transaccionEditando) {
        await updateDoc(doc(db, "transacciones", transaccionEditando.id), data);
        showToast("Transacción actualizada", "success");
      } else {
        await addDoc(collection(db, "transacciones"), {
          ...data,
          fecha: serverTimestamp(),
          creadoEn: serverTimestamp(),
        });
        showToast("Transacción guardada", "success");
      }

      onTransaccionAgregada();
      onClose();
    } catch {
      showToast("Error al guardar la transacción", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-white px-6 pb-10 pt-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">
            {transaccionEditando
              ? "Editar Transacción"
              : "Nueva Transacción"}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo("ingreso")}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition-transform active:scale-95 ${
                tipo === "ingreso"
                  ? "bg-success text-white shadow-lg"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo("gasto")}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition-transform active:scale-95 ${
                tipo === "gasto"
                  ? "bg-danger text-white shadow-lg"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              Gasto
            </button>
          </div>

          <input
            type="text"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-500 transition-transform active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : transaccionEditando
                  ? "Guardar Cambios"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
