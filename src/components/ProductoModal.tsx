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
import type { Producto } from "@/types/producto";

interface ProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  productoEditando?: Producto | null;
}

export default function ProductoModal({
  isOpen,
  onClose,
  productoEditando,
}: ProductoModalProps) {
  const [nombre, setNombre] = useState("");
  const [stock, setStock] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (productoEditando) {
      setNombre(productoEditando.nombre);
      setStock(String(productoEditando.stock));
      setStockMinimo(String(productoEditando.stock_minimo));
      setPrecioCosto(String(productoEditando.precio_costo));
      setPrecioVenta(String(productoEditando.precio_venta));
    } else {
      setNombre("");
      setStock("");
      setStockMinimo("3"); // Límite predeterminado
      setPrecioCosto("");
      setPrecioVenta("");
    }
  }, [productoEditando, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pStock = Number(stock);
    const pStockMin = Number(stockMinimo);
    const pCost = Number(precioCosto);
    const pPrice = Number(precioVenta);

    if (
      !nombre.trim() ||
      stock === "" ||
      stockMinimo === "" ||
      precioCosto === "" ||
      precioVenta === "" ||
      isNaN(pStock) ||
      isNaN(pStockMin) ||
      isNaN(pCost) ||
      isNaN(pPrice) ||
      pStock < 0 ||
      pStockMin < 0 ||
      pCost < 0 ||
      pPrice < 0
    ) {
      showToast("Completa todos los campos correctamente con valores positivos", "error");
      return;
    }

    setGuardando(true);

    try {
      const data = {
        nombre: nombre.trim(),
        stock: pStock,
        stock_minimo: pStockMin,
        precio_costo: pCost,
        precio_venta: pPrice,
      };

      if (productoEditando) {
        await updateDoc(doc(db, "productos", productoEditando.id), data);
        showToast("Producto actualizado", "success");
      } else {
        await addDoc(collection(db, "productos"), {
          ...data,
          creadoEn: serverTimestamp(),
        });
        showToast("Producto guardado en Inventario", "success");
      }

      onClose();
    } catch (err) {
      showToast("Error al guardar el producto", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={productoEditando ? "Editar Producto" : "Nuevo Producto"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre del Producto"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Stock Inicial"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              label="Stock Mínimo Alerta"
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Precio Costo ($)"
              type="number"
              step="0.01"
              min="0"
              value={precioCosto}
              onChange={(e) => setPrecioCosto(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              label="Precio Venta ($)"
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              required
            />
          </div>
        </div>

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
            {guardando ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
