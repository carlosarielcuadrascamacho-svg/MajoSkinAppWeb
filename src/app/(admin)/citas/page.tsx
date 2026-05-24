"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import CitaModal from "@/components/CitaModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/context/ToastContext";

interface Cita {
  id: string;
  cliente_nombre: string;
  tratamiento: string;
  fecha_hora: string;
  notas?: string;
  estado: string;
}

export default function CitasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null);
  const [eliminando, setEliminando] = useState<Cita | null>(null);
  const { showToast } = useToast();

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    const q = query(collection(db, "citas"), orderBy("fecha_hora", "asc"));
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Cita[];
    setCitas(lista);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  const handleEliminar = async () => {
    if (!eliminando) return;
    try {
      await deleteDoc(doc(db, "citas", eliminando.id));
      showToast("Cita eliminada", "success");
      cargarCitas();
    } catch {
      showToast("Error al eliminar la cita", "error");
    }
    setEliminando(null);
  };

  const abrirEditar = (cita: Cita) => {
    setCitaEditando(cita);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setCitaEditando(null);
  };

  const formatearFecha = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex-1 px-6 pt-8">
        <h1 className="mb-6 font-serif text-3xl font-bold tracking-tight">
          Mis Citas
        </h1>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : citas.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-3">
            <Clock className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-400">No hay citas programadas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {citas.map((cita) => (
              <div
                key={cita.id}
                onClick={() => abrirEditar(cita)}
                className="relative rounded-3xl bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.98]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEliminando(cita);
                  }}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger transition-transform active:scale-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <p className="font-serif text-lg font-semibold text-foreground">
                  {cita.cliente_nombre}
                </p>
                <p className="mt-0.5 text-sm text-primary">
                  {cita.tratamiento}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatearFecha(cita.fecha_hora)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-90"
      >
        <Plus className="h-7 w-7" />
      </button>

      <CitaModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onCitaAgregada={cargarCitas}
        citaEditando={citaEditando}
      />

      <ConfirmDialog
        isOpen={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={handleEliminar}
        title="Eliminar cita"
        message={`¿Eliminar la cita de ${eliminando?.cliente_nombre ?? ""}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
