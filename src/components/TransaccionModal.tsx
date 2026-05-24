"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import BottomSheet from "@/components/BottomSheet";
import Input from "@/components/Input";

interface TransaccionEdit {
  id: string;
  tipo: "ingreso" | "gasto";
  descripcion: string;
  monto: number;
}

interface TransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccionEditando?: TransaccionEdit | null;
}

export default function TransaccionModal({
  isOpen,
  onClose,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = Number(monto);
    if (!descripcion.trim() || !monto || isNaN(parsedMonto) || parsedMonto <= 0) {
      showToast("Completa todos los campos correctamente", "error");
      return;
    }
    setGuardando(true);

    try {
      const data = {
        tipo,
        descripcion: descripcion.trim(),
        monto: Number(monto),
      };

      if (transaccionEditando) {
        await updateDoc(doc(db, "transacciones", transaccionEditando.id), data);
        showToast("Transacción actualizada", "success");
      } else {
        await addDoc(collection(db, "transacciones"), {
          ...data,
          creadoEn: serverTimestamp(),
        });
        showToast("Transacción guardada", "success");
      }

      onClose();
    } catch {
      showToast("Error al guardar la transacción", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={transaccionEditando ? "Editar Transacción" : "Nueva Transacción"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo("ingreso")}
            aria-label="Seleccionar ingreso"
            className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all active:scale-95 ${
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
            aria-label="Seleccionar gasto"
            className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all active:scale-95 ${
              tipo === "gasto"
                ? "bg-danger text-white shadow-lg"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            Gasto
          </button>
        </div>

        <Input
          label="Descripción"
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />

        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />

        <div className="flex gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-500 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 active:shadow-xl disabled:opacity-60"
          >
            {guardando
              ? "Guardando..."
              : transaccionEditando
                ? "Guardar Cambios"
                : "Guardar"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
