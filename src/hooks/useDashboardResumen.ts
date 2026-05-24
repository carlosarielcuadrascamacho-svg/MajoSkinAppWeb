import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Cache en memoria para transiciones de página instantáneas (SWR)
let cachedCitasCount = 0;
let cachedIngresos = 0;
let cachedGastos = 0;
let hasCachedDashboard = false;

export function useDashboardResumen() {
  const [citasCount, setCitasCount] = useState(cachedCitasCount);
  const [ingresos, setIngresos] = useState(cachedIngresos);
  const [gastos, setGastos] = useState(cachedGastos);
  const [loading, setLoading] = useState(!hasCachedDashboard);

  useEffect(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const qCitas = query(
      collection(db, "citas"),
      where("estado", "==", "pendiente")
    );

    const qTrans = query(
      collection(db, "transacciones"),
      where("creadoEn", ">=", inicioMes),
      where("creadoEn", "<", finMes)
    );

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded === 2) {
        setLoading(false);
        hasCachedDashboard = true;
      }
    };

    const unsubCitas = onSnapshot(
      qCitas,
      (snap) => {
        setCitasCount(snap.size);
        cachedCitasCount = snap.size;
        checkDone();
      },
      () => {
        checkDone();
      }
    );

    const unsubTrans = onSnapshot(
      qTrans,
      (snap) => {
        let totalIngresos = 0;
        let totalGastos = 0;
        snap.docs.forEach((d) => {
          const monto = d.data().monto || 0;
          if (d.data().tipo === "ingreso") totalIngresos += monto;
          else totalGastos += monto;
        });
        setIngresos(totalIngresos);
        setGastos(totalGastos);
        cachedIngresos = totalIngresos;
        cachedGastos = totalGastos;
        checkDone();
      },
      () => {
        checkDone();
      }
    );

    return () => {
      unsubCitas();
      unsubTrans();
    };
  }, []);

  return { citasCount, ingresos, gastos, loading };
}
