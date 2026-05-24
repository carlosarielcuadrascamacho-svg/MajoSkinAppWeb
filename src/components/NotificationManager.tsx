"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  requestNotificationPermission,
  getFCMToken,
  listenForMessages,
} from "@/lib/messaging";

const INTERVALOS = [
  { key: "24h", ms: 24 * 60 * 60 * 1000, label: "24 horas" },
  { key: "2h", ms: 2 * 60 * 60 * 1000, label: "2 horas" },
  { key: "1h", ms: 1 * 60 * 60 * 1000, label: "1 hora" },
];

const TOLERANCIA_MS = 5 * 60 * 1000;
const CHECK_INTERVAL = 60_000;

export default function NotificationManager() {
  const { currentUser, loading } = useAuth();
  const { showToast } = useToast();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (loading || !currentUser) return;

    const init = async () => {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const token = await getFCMToken(vapidKey);
      if (!token) return;

      await setDoc(doc(db, "fcmTokens", currentUser.uid), { token });

      const unsub = listenForMessages((payload) => {
        const title = payload.notification?.title || "MajoAdmin";
        const body = payload.notification?.body || "";
        showToast(`${title}: ${body}`, "success");
      });

      if (unsub) {
        unsubRef.current = unsub;
      }
    };

    init();
  }, [currentUser, loading, showToast]);

  useEffect(() => {
    if (!currentUser) return;

    const revisarRecordatorios = async () => {
      try {
        const q = query(
          collection(db, "citas"),
          where("estado", "==", "pendiente")
        );
        const snap = await getDocs(q);
        const ahora = Date.now();

        for (const d of snap.docs) {
          const cita = d.data();
          if (!cita.fecha_hora) continue;

          const citaDate = new Date(cita.fecha_hora).getTime();
          if (isNaN(citaDate)) continue;

          const diffMs = citaDate - ahora;
          const recordatorios = cita.recordatorios ?? {};

          for (const intervalo of INTERVALOS) {
            if (recordatorios[intervalo.key]) continue;
            if (diffMs <= 0) continue;

            const diffTarget = Math.abs(diffMs - intervalo.ms);
            if (diffTarget > TOLERANCIA_MS) continue;

            showToast(
              `⏰ ${cita.cliente_nombre || "Cita"} en ${intervalo.label}`,
              "success"
            );

            await updateDoc(doc(db, "citas", d.id), {
              [`recordatorios.${intervalo.key}`]: true,
            });
          }
        }
      } catch {
        /* silencioso */
      }
    };

    revisarRecordatorios();
    const id = setInterval(revisarRecordatorios, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, [currentUser, showToast]);

  return null;
}


