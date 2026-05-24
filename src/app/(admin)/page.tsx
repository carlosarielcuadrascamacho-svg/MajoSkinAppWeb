"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Calendar, TrendingUp, DollarSign, Settings, Download } from "lucide-react";
import { useDashboardResumen } from "@/hooks/useDashboardResumen";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatearMonto } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { requestNotificationPermission, getFCMToken } from "@/lib/messaging";
import BottomSheet from "@/components/BottomSheet";
import OfflineIndicator from "@/components/OfflineIndicator";
import Skeleton from "@/components/Skeleton";

export default function Dashboard() {
  const { citasCount, ingresos, gastos, loading } = useDashboardResumen();
  const { install, isInstallable } = useInstallPrompt();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission);
  }, []);

  const activarNotificaciones = async () => {
    const permission = await requestNotificationPermission();
    if (!permission) {
      showToast("Notificaciones no soportadas en este navegador", "error");
      return;
    }
    setNotifStatus(permission);

    if (permission !== "granted") {
      showToast("Permiso denegado. Actívalo desde la configuración del navegador.", "error");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey || !currentUser) return;

    const token = await getFCMToken(vapidKey);
    if (token) {
      await setDoc(doc(db, "fcmTokens", currentUser.uid), { token });
      showToast("Notificaciones activadas", "success");
    }
  };

  const balance = ingresos - gastos;

  const cards = [
    {
      label: "Próximas Citas",
      value: loading ? null : `${citasCount} pendientes`,
      icon: Calendar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Ingresos del Mes",
      value: loading ? null : formatearMonto(ingresos),
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Balance Total",
      value: loading ? null : formatearMonto(balance),
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: balance >= 0 ? "text-success" : "text-danger",
    },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background px-6 pt-8">
      <OfflineIndicator />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Inicio
          </h1>
          <p className="text-sm text-gray-400">Bienvenida a MajoAdmin</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Abrir ajustes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-90"
        >
          <Settings className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-3xl bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98]"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <p className="text-lg font-semibold text-foreground">
                  {value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Ajustes"
      >
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Notificaciones
          </p>
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              {notifStatus === "granted" ? (
                <Bell className="h-5 w-5 text-success" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {notifStatus === "granted" ? "Activadas" : notifStatus === "denied" ? "Bloqueadas" : notifStatus === "unsupported" ? "No soportado" : "Inactivas"}
                </p>
                <p className="text-xs text-gray-400">
                  {notifStatus === "granted"
                    ? "Recibirás avisos importantes"
                    : notifStatus === "denied"
                      ? "Actívalo en configuración del navegador"
                      : notifStatus === "unsupported"
                        ? "Este navegador no las soporta"
                        : "Recibe avisos de nuevas citas"}
                </p>
              </div>
            </div>
            {notifStatus !== "granted" && notifStatus !== "unsupported" && (
              <button
                onClick={activarNotificaciones}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-white transition-all active:scale-95"
              >
                Activar
              </button>
            )}
          </div>
        </div>

        {isInstallable && (
          <button
            onClick={install}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            Instalar aplicación
          </button>
        )}
        <button
          onClick={() => signOut(auth)}
          className="mb-6 w-full rounded-full bg-danger/10 px-6 py-3 text-sm font-medium text-danger transition-all active:scale-95"
        >
          Cerrar sesión
        </button>
      </BottomSheet>
    </div>
  );
}
