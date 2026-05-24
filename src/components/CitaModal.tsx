"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TRATAMIENTOS, ESTADOS_CITA, PRECIOS_SUGERIDOS } from "@/constants/citas";
import { useToast } from "@/context/ToastContext";
import { formatearMonto } from "@/lib/utils";
import BottomSheet from "@/components/BottomSheet";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import type { Cita } from "@/types/cita";

function toDatetimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

interface CitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  citaEditando?: Cita | null;
}

export default function CitaModal({
  isOpen,
  onClose,
  citaEditando,
}: CitaModalProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [guardando, setGuardando] = useState(false);
  const { showToast } = useToast();

  const hoyMin = useMemo(() => toDatetimeLocal(new Date()), []);

  useEffect(() => {
    if (citaEditando) {
      setNombre(citaEditando.cliente_nombre);
      setTelefono(citaEditando.cliente_telefono ?? "");
      setTratamiento(citaEditando.tratamiento);
      setFecha(citaEditando.fecha_hora);
      setNotas(citaEditando.notas ?? "");
      setEstado(citaEditando.estado);
    } else {
      setNombre("");
      setTelefono("");
      setTratamiento("");
      setFecha("");
      setNotas("");
      setEstado("pendiente");
    }
  }, [citaEditando, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !tratamiento.trim() || !fecha) {
      showToast("Completa todos los campos obligatorios", "error");
      return;
    }
    setGuardando(true);

    try {
      const data = {
        cliente_nombre: nombre.trim(),
        cliente_telefono: telefono.trim(),
        tratamiento: tratamiento.trim(),
        fecha_hora: fecha,
        notas: notas.trim(),
        estado,
      };

      if (citaEditando) {
        await updateDoc(doc(db, "citas", citaEditando.id), data);
        showToast("Cita actualizada", "success");
      } else {
        await addDoc(collection(db, "citas"), {
          ...data,
          recordatorios: {},
          creadoEn: serverTimestamp(),
        });
        showToast("Cita guardada", "success");
      }

      onClose();
    } catch {
      showToast("Error al guardar la cita", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={citaEditando ? "Editar Cita" : "Nueva Cita"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre de la clienta"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <Input
          label="Teléfono de la clienta (opcional, para WhatsApp)"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Ej: 6671234567"
        />

        <Select
          label="Tratamiento"
          value={tratamiento}
          onChange={(e) => setTratamiento(e.target.value)}
          required
        >
          <option value="" disabled>
            Seleccionar tratamiento
          </option>
          {TRATAMIENTOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        {PRECIOS_SUGERIDOS[tratamiento] && (
          <p className="-mt-2 ml-4 text-xs text-success">
            Precio sugerido: {formatearMonto(PRECIOS_SUGERIDOS[tratamiento])}
          </p>
        )}

        <div>
          <label className="mb-1 ml-4 block text-xs font-medium text-gray-400">
            Fecha y hora
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={hoyMin}
              required
              className="w-full rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-base text-foreground transition placeholder:text-gray-300 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
            />
          </div>
        </div>

        <Select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          {ESTADOS_CITA.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </Select>

        <Textarea
          label="Notas (opcional)"
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
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
              : citaEditando
                ? "Guardar Cambios"
                : "Guardar Cita"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
