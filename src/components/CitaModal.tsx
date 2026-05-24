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

interface CitaEdit {
  id: string;
  cliente_nombre: string;
  tratamiento: string;
  fecha_hora: string;
  notas?: string;
}

interface CitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitaAgregada: () => void;
  citaEditando?: CitaEdit | null;
}

export default function CitaModal({
  isOpen,
  onClose,
  onCitaAgregada,
  citaEditando,
}: CitaModalProps) {
  const [nombre, setNombre] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (citaEditando) {
      setNombre(citaEditando.cliente_nombre);
      setTratamiento(citaEditando.tratamiento);
      setFecha(citaEditando.fecha_hora);
      setNotas(citaEditando.notas ?? "");
    } else {
      setNombre("");
      setTratamiento("");
      setFecha("");
      setNotas("");
    }
  }, [citaEditando, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const data = {
        cliente_nombre: nombre,
        tratamiento,
        fecha_hora: fecha,
        notas,
      };

      if (citaEditando) {
        await updateDoc(doc(db, "citas", citaEditando.id), data);
        showToast("Cita actualizada", "success");
      } else {
        await addDoc(collection(db, "citas"), {
          ...data,
          estado: "pendiente",
          creadoEn: serverTimestamp(),
        });
        showToast("Cita guardada", "success");
      }

      onCitaAgregada();
      onClose();
    } catch {
      showToast("Error al guardar la cita", "error");
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
            {citaEditando ? "Editar Cita" : "Nueva Cita"}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nombre de la clienta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <select
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="" disabled>
              Seleccionar tratamiento
            </option>
            <option value="Limpieza Facial">Limpieza Facial</option>
            <option value="Hidratacion">Hidratación</option>
            <option value="Radiofrecuencia">Radiofrecuencia</option>
            <option value="Dermaplaning">Dermaplaning</option>
            <option value="Micropigmentacion">Micropigmentación</option>
            <option value="Otro">Otro</option>
          </select>

          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <textarea
            placeholder="Notas (opcional)"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="resize-none rounded-3xl border border-[#E5E5E5] px-5 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                : citaEditando
                  ? "Guardar Cambios"
                  : "Guardar Cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
