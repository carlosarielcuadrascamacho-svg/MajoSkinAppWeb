import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { citaConverter, type Cita } from "@/types/cita";

// Cache en memoria para transiciones de página instantáneas (SWR)
let cachedCitas: Cita[] | null = null;

export function useCitas() {
  const [citas, setCitas] = useState<Cita[]>(cachedCitas || []);
  const [loading, setLoading] = useState(cachedCitas === null);

  useEffect(() => {
    const q = query(
      collection(db, "citas"),
      orderBy("fecha_hora", "asc")
    ).withConverter(citaConverter);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => doc.data());
        cachedCitas = lista;
        setCitas(lista);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { citas, loading };
}
