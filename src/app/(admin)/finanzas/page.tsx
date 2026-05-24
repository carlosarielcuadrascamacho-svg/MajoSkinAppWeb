"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Wallet,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Package,
  Share2,
  ShoppingBag,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTransacciones } from "@/hooks/useTransacciones";
import { useProductos } from "@/hooks/useProductos";
import { useCitas } from "@/hooks/useCitas";
import TransaccionModal from "@/components/TransaccionModal";
import ProductoModal from "@/components/ProductoModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import OfflineIndicator from "@/components/OfflineIndicator";
import Skeleton from "@/components/Skeleton";
import BottomSheet from "@/components/BottomSheet";
import { useToast } from "@/context/ToastContext";
import { formatearMonto } from "@/lib/utils";
import { descargarCSV } from "@/lib/csv";
import type { Transaccion } from "@/types/transaccion";
import type { Producto } from "@/types/producto";

type Vista = "dia" | "semana" | "mes" | "año";

function inicioSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia; // Lunes como inicio
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finSemana(fecha: Date): Date {
  const d = inicioSemana(fecha);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function transaccionEnVista(t: Transaccion, vista: Vista, enfoque: Date): boolean {
  if (!t.creadoEn?.seconds) return false;
  const fecha = new Date(t.creadoEn.seconds * 1000);

  if (vista === "dia") {
    return (
      fecha.getDate() === enfoque.getDate() &&
      fecha.getMonth() === enfoque.getMonth() &&
      fecha.getFullYear() === enfoque.getFullYear()
    );
  }

  if (vista === "semana") {
    const inicio = inicioSemana(enfoque);
    const fin = finSemana(enfoque);
    return fecha >= inicio && fecha <= fin;
  }

  if (vista === "año") {
    return fecha.getFullYear() === enfoque.getFullYear();
  }

  // mes
  return (
    fecha.getMonth() === enfoque.getMonth() &&
    fecha.getFullYear() === enfoque.getFullYear()
  );
}

function navegar(vista: Vista, enfoque: Date, delta: number): Date {
  const d = new Date(enfoque);
  if (vista === "dia") d.setDate(d.getDate() + delta);
  else if (vista === "semana") d.setDate(d.getDate() + delta * 7);
  else if (vista === "mes") d.setMonth(d.getMonth() + delta);
  else d.setFullYear(d.getFullYear() + delta);
  return d;
}

function tituloVista(vista: Vista, enfoque: Date): string {
  if (vista === "dia") {
    return enfoque.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (vista === "semana") {
    const inicio = inicioSemana(enfoque);
    const fin = finSemana(enfoque);
    const iniStr = inicio.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    const finStr = fin.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    return `${iniStr} – ${finStr}`;
  }
  if (vista === "año") {
    return String(enfoque.getFullYear());
  }
  return enfoque.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
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
  const { productos, loading: loadingProductos } = useProductos();
  const { citas } = useCitas();
  
  const [seccion, setSeccion] = useState<"movimientos" | "inventario">("movimientos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [editando, setEditando] = useState<Transaccion | null>(null);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState<Transaccion | null>(null);
  const [eliminandoProducto, setEliminandoProducto] = useState<Producto | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [eliminandoProductoId, setEliminandoProductoId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("mes");
  const [enfoque, setEnfoque] = useState(() => new Date());
  const { showToast } = useToast();

  // Calcular la velocidad diaria y estimación de fin de stock
  const prediccionesInventario = useMemo(() => {
    const ahora = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(ahora.getDate() - 30);

    const conteoVentas30d: Record<string, number> = {};
    citas.forEach((c) => {
      if (c.estado === "completada" && c.productoVendidoId && c.fecha_hora) {
        const fechaCita = new Date(c.fecha_hora);
        if (fechaCita >= hace30Dias) {
          conteoVentas30d[c.productoVendidoId] = (conteoVentas30d[c.productoVendidoId] || 0) + 1;
        }
      }
    });

    const resultados: Record<string, { diaria: number; diasRestantes: number | string }> = {};
    productos.forEach((p) => {
      const ventas = conteoVentas30d[p.id] || 0;
      const diaria = Number((ventas / 30).toFixed(3));
      let diasRestantes: number | string = "Estable";
      if (diaria > 0) {
        diasRestantes = Math.max(0, Math.round(p.stock / diaria));
      }
      resultados[p.id] = { diaria, diasRestantes };
    });

    return resultados;
  }, [productos, citas]);

  // Construir la lista de compras sugeridas
  const listaComprasSugerida = useMemo(() => {
    return productos
      .map((p) => {
        const pred = prediccionesInventario[p.id] || { diaria: 0, diasRestantes: "Estable" };
        const criticoStock = p.stock <= p.stock_minimo;
        const criticoDias = typeof pred.diasRestantes === "number" && pred.diasRestantes <= 7;
        const necesitaReabastecer = criticoStock || criticoDias || p.stock === 0;

        // Cantidad sugerida: llegar al triple del mínimo o un lote básico de 5
        const cantidadSugerida = necesitaReabastecer
          ? Math.max(5, (p.stock_minimo * 3) - p.stock)
          : 0;

        return {
          producto: p,
          pred,
          necesitaReabastecer,
          cantidadSugerida,
          motivo: p.stock === 0 
            ? "Agotado" 
            : criticoStock 
              ? "Bajo mínimo" 
              : "Se agota pronto (< 7 días)"
        };
      })
      .filter((item) => item.necesitaReabastecer);
  }, [productos, prediccionesInventario]);

  const enviarListaProveedor = () => {
    if (listaComprasSugerida.length === 0) return;
    
    let mensaje = `*Lista de Compras Sugerida - MajoSkin* 🛒✨\n\nHola! Me gustaría cotizar el siguiente pedido de insumos de cabina:\n`;
    listaComprasSugerida.forEach((item) => {
      mensaje += `- *${item.cantidadSugerida} pz* x ${item.producto.nombre} (Motivo: ${item.motivo})\n`;
    });
    mensaje += `\n¡Muchas gracias! 💕`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const handleEliminar = async () => {
    if (!eliminando) return;
    setEliminandoId(eliminando.id);
    try {
      await deleteDoc(doc(db, "transacciones", eliminando.id));
      showToast("Transacción eliminada", "success");
    } catch {
      showToast("Error al eliminar la transacción", "error");
    }
    setEliminando(null);
    setEliminandoId(null);
  };

  const handleEliminarProducto = async () => {
    if (!eliminandoProducto) return;
    setEliminandoProductoId(eliminandoProducto.id);
    try {
      await deleteDoc(doc(db, "productos", eliminandoProducto.id));
      showToast("Producto eliminado del Inventario", "success");
    } catch {
      showToast("Error al eliminar el producto", "error");
    }
    setEliminandoProducto(null);
    setEliminandoProductoId(null);
  };

  const abrirEditarProducto = (prod: Producto) => {
    setProductoEditando(prod);
    setIsProdModalOpen(true);
  };

  const cerrarProductoModal = () => {
    setIsProdModalOpen(false);
    setProductoEditando(null);
  };

  const abrirEditar = (t: Transaccion) => {
    setEditando(t);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditando(null);
  };

  const navegarVista = (delta: number) => {
    setEnfoque((prev) => navegar(vista, prev, delta));
  };

  const filtradas = transacciones.filter((t) =>
    transaccionEnVista(t, vista, enfoque)
  );

  const ingresos = filtradas
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);

  const gastos = filtradas
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.monto, 0);

  const balance = ingresos - gastos;

  // 1. Calcular totales por categoría para Ingresos
  const categoriasIngresos: Record<string, number> = {
    "Servicios": 0,
    "Venta de Productos": 0,
    "Otros": 0,
  };
  filtradas
    .filter((t) => t.tipo === "ingreso")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      if (categoriasIngresos[cat] !== undefined) {
        categoriasIngresos[cat] += t.monto;
      } else {
        categoriasIngresos["Otros"] += t.monto;
      }
    });

  // 2. Calcular totales por categoría para Gastos
  const categoriasGastos: Record<string, number> = {
    "Insumos y Materiales": 0,
    "Renta y Servicios": 0,
    "Publicidad": 0,
    "Capacitación": 0,
    "Otros": 0,
  };
  filtradas
    .filter((t) => t.tipo === "gasto")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      if (categoriasGastos[cat] !== undefined) {
        categoriasGastos[cat] += t.monto;
      } else {
        categoriasGastos["Otros"] += t.monto;
      }
    });

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
  const VISTAS: { key: Vista; label: string }[] = [
    { key: "dia", label: "Día" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mes" },
    { key: "año", label: "Año" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground pb-24">
      <OfflineIndicator />

      <div className="flex-1 px-6 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Finanzas
          </h1>
          {seccion === "movimientos" && transacciones.length > 0 && (
            <button
              onClick={() => exportarTransacciones(transacciones)}
              aria-label="Exportar finanzas a CSV"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-90"
            >
              <Download className="h-5 w-5 text-muted" />
            </button>
          )}
        </div>

        {/* Segmented Section Selector: Movimientos vs Inventario */}
        <div className="mb-5 flex rounded-full bg-card p-1 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border">
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(20);
              }
              setSeccion("movimientos");
            }}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
              seccion === "movimientos"
                ? "bg-primary text-white shadow-sm"
                : "text-muted active:scale-95"
            }`}
          >
            Movimientos
          </button>
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(20);
              }
              setSeccion("inventario");
            }}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
              seccion === "inventario"
                ? "bg-primary text-white shadow-sm"
                : "text-muted active:scale-95"
            }`}
          >
            Inventario
          </button>
        </div>

        {seccion === "movimientos" && (
          <>
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
                      className="rounded-3xl bg-card px-3 py-4 text-center border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                    >
                      <p className="text-xs text-muted">{label}</p>
                      <p className={`mt-1 text-sm font-bold ${textColor}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 mb-3 flex rounded-full bg-card p-1 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border">
                  {VISTAS.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => {
                        setVista(v.key);
                        setEnfoque(new Date());
                      }}
                      className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
                        vista === v.key
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted active:scale-95"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <div className="mb-4 flex items-center justify-center gap-4">
                  <button
                    onClick={() => navegarVista(-1)}
                    aria-label="Anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-90"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted" />
                  </button>
                  <p className="text-center text-sm font-medium capitalize text-foreground">
                    {tituloVista(vista, enfoque)}
                  </p>
                  <button
                    onClick={() => navegarVista(1)}
                    aria-label="Siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-90"
                  >
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                </div>

                {/* Desglose por categorías premium */}
                {filtradas.length > 0 && (
                  <div className="mb-6 rounded-3xl bg-card p-5 border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                      Desglose por Categorías
                    </p>
                    <div className="flex flex-col gap-5">
                      {/* Ingresos */}
                      {ingresos > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-success uppercase tracking-wider">Ingresos</span>
                            <span className="text-xs text-success font-semibold">{formatearMonto(ingresos)}</span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {Object.entries(categoriasIngresos).map(([cat, monto]) => {
                              if (monto === 0) return null;
                              const porcentaje = Math.round((monto / ingresos) * 100);
                              return (
                                <div key={cat} className="text-xs">
                                  <div className="flex justify-between text-muted mb-1 font-medium">
                                    <span>{cat}</span>
                                    <span>{porcentaje}% ({formatearMonto(monto)})</span>
                                  </div>
                                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-success h-full rounded-full transition-all duration-500" 
                                      style={{ width: `${porcentaje}%` }} 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Gastos */}
                      {gastos > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-danger uppercase tracking-wider">Gastos</span>
                            <span className="text-xs text-danger font-semibold">{formatearMonto(gastos)}</span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {Object.entries(categoriasGastos).map(([cat, monto]) => {
                              if (monto === 0) return null;
                              const porcentaje = Math.round((monto / gastos) * 100);
                              return (
                                <div key={cat} className="text-xs">
                                  <div className="flex justify-between text-muted mb-1 font-medium">
                                    <span>{cat}</span>
                                    <span>{porcentaje}% ({formatearMonto(monto)})</span>
                                  </div>
                                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-danger h-full rounded-full transition-all duration-500" 
                                      style={{ width: `${porcentaje}%` }} 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {filtradas.length === 0 ? (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <Wallet className="h-10 w-10 text-muted" />
                    <p className="text-sm text-muted">
                      Sin movimientos en {vista === "año" ? enfoque.getFullYear() : tituloVista(vista, enfoque)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-24">
                    {filtradas.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => abrirEditar(t)}
                        className="flex items-start justify-between rounded-3xl bg-card border border-border px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-[0.98] text-foreground"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t.descripcion}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {t.tipo === "ingreso" ? "Ingreso" : "Gasto"} • {t.categoria || "Otros"}
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
                              if (typeof navigator !== "undefined" && navigator.vibrate) {
                                navigator.vibrate(20);
                              }
                              setEliminando(t);
                            }}
                            disabled={eliminandoId === t.id}
                            aria-label="Eliminar transacción"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90 disabled:opacity-40"
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
          </>
        )}

        {seccion === "inventario" && (
          <>
            {loadingProductos ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : productos.length === 0 ? (
              <div className="mt-20 flex flex-col items-center gap-3">
                <Package className="h-10 w-10 text-muted" />
                <p className="text-sm text-muted">Sin productos en Inventario</p>
                <button
                  onClick={() => setIsProdModalOpen(true)}
                  className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-md active:scale-95"
                >
                  Agregar Producto
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-24">
                <button
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(20);
                    }
                    setIsRestockOpen(true);
                  }}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-6 py-3 text-sm font-semibold text-primary transition-all active:scale-95"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Lista de Compras Inteligente 🛒
                </button>
                {productos.map((p) => {
                  const bajoStock = p.stock <= p.stock_minimo;
                  const pred = prediccionesInventario[p.id] || { diaria: 0, diasRestantes: "Estable" };
                  return (
                    <div
                      key={p.id}
                      onClick={() => abrirEditarProducto(p)}
                      className="relative rounded-3xl bg-card border border-border px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-[0.98] text-foreground"
                    >
                      <div className="absolute right-4 top-4 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof navigator !== "undefined" && navigator.vibrate) {
                              navigator.vibrate(20);
                            }
                            abrirEditarProducto(p);
                          }}
                          aria-label="Editar producto"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-muted transition-all active:scale-90"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof navigator !== "undefined" && navigator.vibrate) {
                              navigator.vibrate(20);
                            }
                            setEliminandoProducto(p);
                          }}
                          disabled={eliminandoProductoId === p.id}
                          aria-label="Eliminar producto"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger transition-all active:scale-90 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="pr-20">
                        <p className="font-serif text-lg font-semibold text-foreground">
                          {p.nombre}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              bajoStock 
                                ? "bg-danger/10 text-danger" 
                                : "bg-success/10 text-success"
                            }`}
                          >
                            {bajoStock ? `⚠️ Bajo Stock: ${p.stock} pz` : `Stock: ${p.stock} pz`}
                          </span>
                          {pred.diaria > 0 && (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-500">
                              ⏱️ Restan: ~{pred.diasRestantes} días
                            </span>
                          )}
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                            Costo: {formatearMonto(p.precio_costo)}
                          </span>
                          <span className="rounded-full bg-border px-2.5 py-0.5 text-[10px] font-medium text-muted">
                            Venta: {formatearMonto(p.precio_venta)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
          }
          if (seccion === "movimientos") {
            setIsModalOpen(true);
          } else {
            setIsProdModalOpen(true);
          }
        }}
        aria-label={seccion === "movimientos" ? "Nueva transacción" : "Nuevo producto"}
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

      <ProductoModal
        isOpen={isProdModalOpen}
        onClose={cerrarProductoModal}
        productoEditando={productoEditando}
      />

      <ConfirmDialog
        isOpen={!!eliminando}
        onClose={() => {
          if (!eliminandoId) setEliminando(null);
        }}
        onConfirm={handleEliminar}
        title="Eliminar transacción"
        message={`¿Eliminar "${eliminando?.descripcion ?? ""}"? Esta acción no se puede deshacer.`}
        loading={!!eliminandoId}
      />

      <ConfirmDialog
        isOpen={!!eliminandoProducto}
        onClose={() => {
          if (!eliminandoProductoId) setEliminandoProducto(null);
        }}
        onConfirm={handleEliminarProducto}
        title="Eliminar producto"
        message={`¿Eliminar "${eliminandoProducto?.nombre ?? ""}" del Inventario? Esta acción no se puede deshacer.`}
        loading={!!eliminandoProductoId}
      />

      {/* BottomSheet: Lista de Compras Inteligente */}
      <BottomSheet
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        title="Lista de Compras Inteligente 🛒"
      >
        <div className="flex flex-col gap-4 pb-safe text-foreground">
          <p className="text-xs text-muted">
            Este análisis calcula la velocidad diaria de venta basada en las citas completadas de los últimos 30 días para recomendar los productos a resurtir de forma preventiva.
          </p>

          {listaComprasSugerida.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Package className="h-10 w-10 text-success" />
              <p className="text-sm font-semibold text-success">¡Inventario Excelente! ✨</p>
              <p className="text-xs text-muted">
                Todos tus productos tienen suficiente stock y ritmo estable de venta. No requieres resurtir nada hoy.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto flex flex-col gap-2.5 rounded-2xl bg-border/20 p-4 border border-border">
                {listaComprasSugerida.map((item) => (
                  <div 
                    key={item.producto.id} 
                    className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{item.producto.nombre}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Stock actual: {item.producto.stock} pz (Min: {item.producto.stock_minimo})
                      </p>
                      <span className="mt-1 inline-block rounded bg-danger/10 px-1.5 py-0.2 text-[9px] font-bold text-danger">
                        {item.motivo}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">
                        +{item.cantidadSugerida} pz
                      </p>
                      <p className="text-[10px] text-muted">Sugerido</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={enviarListaProveedor}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-success py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
              >
                <Share2 className="h-4.5 w-4.5" />
                Compartir Pedido por WhatsApp
              </button>
            </>
          )}

          {/* Velocidad de rotación informativa */}
          <div className="mt-2">
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
              Análisis de Rotación
            </p>
            <div className="flex flex-col gap-2 text-xs">
              {productos.map((p) => {
                const pred = prediccionesInventario[p.id];
                if (!pred || pred.diaria === 0) return null;
                return (
                  <div key={p.id} className="flex justify-between py-1 border-b border-border/25 last:border-0">
                    <span className="text-muted">{p.nombre}</span>
                    <span className="font-medium text-foreground">
                      {pred.diaria} pz/día ({Math.round(pred.diaria * 30)} al mes)
                    </span>
                  </div>
                );
              })}
              {!Object.values(prediccionesInventario).some(p => p.diaria > 0) && (
                <p className="text-[11px] text-muted italic">Sin ventas de productos registradas en los últimos 30 días.</p>
              )}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
