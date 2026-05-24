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
import { TRATAMIENTOS, ESTADOS_CITA } from "@/constants/citas";
import { useToast } from "@/context/ToastContext";
import BottomSheet from "@/components/BottomSheet";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import type { Cita } from "@/types/cita";

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
  const [tratamiento, setTratamiento] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [guardando, setGuardando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (citaEditando) {
      setNombre(citaEditando.cliente_nombre);
      setTratamiento(citaEditando.tratamiento);
      setFecha(citaEditando.fecha_hora);
      setNotas(citaEditando.notas ?? "");
      setEstado(citaEditando.estado);
    } else {
      setNombre("");
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

        <Input
          label="Fecha y hora"
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />

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
