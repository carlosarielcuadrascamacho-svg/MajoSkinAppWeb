import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { productoConverter, type Producto } from "@/types/producto";

// Cache en memoria para transiciones de página instantáneas (SWR)
let cachedProductos: Producto[] | null = null;

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>(cachedProductos || []);
  const [loading, setLoading] = useState(cachedProductos === null);

  useEffect(() => {
    const q = query(
      collection(db, "productos"),
      orderBy("nombre", "asc")
    ).withConverter(productoConverter);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => doc.data());
        cachedProductos = lista;
        setProductos(lista);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { productos, loading };
}
