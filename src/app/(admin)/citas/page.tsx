"use client";

import { useState, useMemo } from "react";
import { Plus, Clock, Trash2, Download, Search } from "lucide-react";
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

function enviarConfirmacion(cita: Cita) {
  if (!cita.cliente_telefono) return;
  const fecha = formatearFecha(cita.fecha_hora);
  const mensaje = encodeURIComponent(
    `¡Hola ${cita.cliente_nombre}! ✨ Te escribo de MajoSkin para recordarte tu cita de *${cita.tratamiento}* el día *${fecha}*. ¿Nos confirmas tu asistencia? ¡Que tengas un excelente día! 💕`
  );
  const formattedPhone = cita.cliente_telefono.startsWith("+") 
    ? cita.cliente_telefono.replace("+", "") 
    : cita.cliente_telefono.startsWith("52") 
      ? cita.cliente_telefono 
      : `52${cita.cliente_telefono}`;
  window.open(`https://wa.me/${formattedPhone}?text=${mensaje}`, "_blank");
}

export default function CitasPage() {
  const { citas, loading } = useCitas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [diaFiltro, setDiaFiltro] = useState<Date | null>(null);
  const [eliminando, setEliminando] = useState<Cita | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const { showToast } = useToast();

  const diasSemana = useMemo(() => {
    const list = [];
    const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const hoy = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(hoy.getDate() + i);
      list.push({
        nombre: diasNombres[d.getDay()],
        numero: d.getDate(),
        objeto: d,
      });
    }
    return list;
  }, []);

  const filtradas = useMemo(() => {
    let temp = citas;
    if (busqueda.trim()) {
      temp = temp.filter((c) =>
        c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase().trim())
      );
    }
    if (diaFiltro) {
      temp = temp.filter((c) => {
        const cDate = new Date(c.fecha_hora);
        return (
          cDate.getDate() === diaFiltro.getDate() &&
          cDate.getMonth() === diaFiltro.getMonth() &&
          cDate.getFullYear() === diaFiltro.getFullYear()
        );
      });
    }
    return temp;
  }, [citas, busqueda, diaFiltro]);

  const handleEliminar = async () => {
    if (!eliminando) return;
    setEliminandoId(eliminando.id);
    try {
      await deleteDoc(doc(db, "citas", eliminando.id));
      showToast("Cita eliminada", "success");
    } catch {
      showToast("Error al eliminar la cita", "error");
    }
    setEliminando(null);
    setEliminandoId(null);
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
  filtradas.forEach((cita) => {
    const grupo = obtenerGrupo(cita.fecha_hora);
    if (!citasAgrupadas[grupo]) citasAgrupadas[grupo] = [];
    citasAgrupadas[grupo].push(cita);
  });

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground pb-24">
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-90"
            >
              <Download className="h-5 w-5 text-muted" />
            </button>
          )}
        </div>

        {!loading && (
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              aria-label="Buscar citas por nombre de clienta"
              className="w-full rounded-full border border-input-border bg-input-bg text-foreground py-2.5 pl-11 pr-5 text-sm transition placeholder:text-muted/60 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        )}

        {/* Slider horizontal de Mini Calendario */}
        {!loading && citas.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Agenda esta semana
              </p>
              {diaFiltro && (
                <button
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(20);
                    }
                    setDiaFiltro(null);
                  }}
                  className="text-xs font-semibold text-primary active:scale-95"
                >
                  Ver todas
                </button>
              )}
            </div>
            <div className="no-scrollbar -mx-6 flex gap-3 overflow-x-auto px-6 pb-2">
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(20);
                  }
                  setDiaFiltro(null);
                }}
                className={`flex flex-col items-center justify-center rounded-2xl min-w-[54px] py-3 text-xs font-semibold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${
                  diaFiltro === null
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                    : "bg-card text-muted border border-border active:scale-95"
                }`}
              >
                <span>Todo</span>
                <span className="text-[10px] mt-0.5 opacity-80">Citas</span>
              </button>
              {diasSemana.map((d) => {
                const active =
                  diaFiltro !== null &&
                  d.objeto.getDate() === diaFiltro.getDate() &&
                  d.objeto.getMonth() === diaFiltro.getMonth() &&
                  d.objeto.getFullYear() === diaFiltro.getFullYear();

                return (
                  <button
                    key={d.numero + d.nombre}
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.vibrate) {
                        navigator.vibrate(20);
                      }
                      setDiaFiltro(active ? null : d.objeto);
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl min-w-[54px] py-3 text-xs font-semibold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${
                      active
                        ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                        : "bg-card text-muted border border-border active:scale-95"
                    }`}
                  >
                    <span className="opacity-80">{d.nombre}</span>
                    <span className="text-base font-bold mt-0.5">{d.numero}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtradas.length === 0 && busqueda.trim() ? (
          <div className="mt-20 flex flex-col items-center gap-3">
            <Search className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-400">Sin resultados para "{busqueda}"</p>
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
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {grupo}
                </p>
                <div className="flex flex-col gap-3">
                  {citasGrupo.map((cita) => (
                    <div
                      key={cita.id}
                      onClick={() => abrirEditar(cita)}
                      className="relative rounded-3xl bg-card border border-border px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-[0.98] text-foreground"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof navigator !== "undefined" && navigator.vibrate) {
                            navigator.vibrate(20);
                          }
                          setEliminando(cita);
                        }}
                        disabled={eliminandoId === cita.id}
                        aria-label="Eliminar cita"
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof navigator !== "undefined" && navigator.vibrate) {
                            navigator.vibrate(20);
                          }
                          if (!cita.cliente_telefono) {
                            showToast("Edita la cita para añadir el teléfono de la clienta y confirmar por WhatsApp", "error");
                            return;
                          }
                          enviarConfirmacion(cita);
                        }}
                        aria-label="Confirmar cita por WhatsApp"
                        className={`absolute right-14 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 ${
                          cita.cliente_telefono 
                            ? "bg-success/10 text-success hover:bg-success/20" 
                            : "bg-border text-muted/40 hover:bg-border/60"
                        }`}
                      >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.02-5.11-2.881-6.974-1.86-1.863-4.334-2.886-6.971-2.887-5.441 0-9.87 4.43-9.874 9.858-.001 1.637.425 3.235 1.238 4.646L1.88 21.6l4.767-1.25c.001-.001.001-.001.001-.001zm11.367-7.251c-.33-.164-1.952-.964-2.251-1.074-.3-.109-.518-.164-.736.164-.218.327-.844 1.074-1.034 1.293-.19.218-.379.245-.71.082-.33-.164-1.393-.513-2.653-1.638-.98-.874-1.641-1.953-1.833-2.28-.192-.327-.02-.504.145-.668.148-.148.33-.382.495-.572.164-.191.218-.328.327-.546.11-.218.055-.409-.028-.572-.082-.164-.736-1.775-1.009-2.43-.265-.636-.53-.55-.736-.56-.19-.01-.409-.01-.627-.01-.218 0-.572.082-.872.409-.3.327-1.145 1.118-1.145 2.727 0 1.61 1.173 3.163 1.336 3.382.164.218 2.307 3.522 5.59 4.945.78.338 1.39.54 1.865.69.785.25 1.5.214 2.065.13.629-.093 1.952-.799 2.224-1.572.272-.773.272-1.436.191-1.572-.081-.136-.3-.218-.63-.382z" />
                        </svg>
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
                      <p className="mt-0.5 text-sm text-primary font-medium">
                        {cita.tratamiento}
                      </p>
                      <p className="mt-1 text-xs text-muted">
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
        onClose={() => {
          if (!eliminandoId) setEliminando(null);
        }}
        onConfirm={handleEliminar}
        title="Eliminar cita"
        message={`¿Eliminar la cita de ${eliminando?.cliente_nombre ?? ""}? Esta acción no se puede deshacer.`}
        loading={!!eliminandoId}
      />
    </div>
  );
}
