"use client";

import { useState } from "react";
import { Plus, Clock, Trash2, Download } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCitas } from "@/hooks/useCitas";
import { BADGE_COLOR } from "@/constants/citas";
import CitaModal from "@/components/CitaModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import OfflineIndicator from "@/components/OfflineIndicator";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/context/ToastContext";
import { descargarCSV } from "@/lib/csv";
import type { Cita } from "@/types/cita";

function formatearFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerGrupo(iso: string): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const citaDate = new Date(iso);
  citaDate.setHours(0, 0, 0, 0);

  const diff = Math.round(
    (citaDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff <= 7) return "Próximos días";
  return citaDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });
}

function exportarCitas(citas: Cita[]) {
  descargarCSV(
    `citas-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Cliente", "Tratamiento", "Fecha", "Estado", "Notas"],
    citas.map((c) => [
      c.cliente_nombre,
      c.tratamiento,
      c.fecha_hora,
      c.estado,
      c.notas ?? "",
    ])
  );
}

export default function CitasPage() {
  const { citas, loading } = useCitas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null);
  const [eliminando, setEliminando] = useState<Cita | null>(null);
  const { showToast } = useToast();

  const handleEliminar = async () => {
    if (!eliminando) return;
    try {
      await deleteDoc(doc(db, "citas", eliminando.id));
      showToast("Cita eliminada", "success");
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

  const citasAgrupadas: Record<string, Cita[]> = {};
  citas.forEach((cita) => {
    const grupo = obtenerGrupo(cita.fecha_hora);
    if (!citasAgrupadas[grupo]) citasAgrupadas[grupo] = [];
    citasAgrupadas[grupo].push(cita);
  });

  return (
    <div className="flex min-h-full flex-col bg-background">
      <OfflineIndicator />

      <div className="flex-1 px-6 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Mis Citas
          </h1>
          {citas.length > 0 && (
            <button
              onClick={() => exportarCitas(citas)}
              aria-label="Exportar citas a CSV"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
            >
              <Download className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

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
          <div className="flex flex-col gap-6 pb-4">
            {Object.entries(citasAgrupadas).map(([grupo, citasGrupo]) => (
              <div key={grupo}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {grupo}
                </p>
                <div className="flex flex-col gap-3">
                  {citasGrupo.map((cita) => (
                    <div
                      key={cita.id}
                      onClick={() => abrirEditar(cita)}
                      className="relative rounded-3xl bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98]"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEliminando(cita);
                        }}
                        aria-label="Eliminar cita"
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <p className="font-serif text-lg font-semibold text-foreground">
                          {cita.cliente_nombre}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${BADGE_COLOR[cita.estado] ?? BADGE_COLOR.pendiente}`}
                        >
                          {cita.estado}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-primary">
                        {cita.tratamiento}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatearFecha(cita.fecha_hora)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        aria-label="Nueva cita"
        className="fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all active:scale-90 active:shadow-xl"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Plus className="h-7 w-7" />
      </button>

      <CitaModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
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
