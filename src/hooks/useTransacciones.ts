import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  transaccionConverter,
  type Transaccion,
} from "@/types/transaccion";

// Cache en memoria para transiciones de página instantáneas (SWR)
let cachedTransacciones: Transaccion[] | null = null;

export function useTransacciones() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>(
    cachedTransacciones || []
  );
  const [loading, setLoading] = useState(cachedTransacciones === null);

  useEffect(() => {
    // Requires composite index on transacciones: creadoEn DESC
    const q = query(
      collection(db, "transacciones"),
      orderBy("creadoEn", "desc")
    ).withConverter(transaccionConverter);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => doc.data());
        cachedTransacciones = lista;
        setTransacciones(lista);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { transacciones, loading };
}
