"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, BellOff, Calendar, TrendingUp, DollarSign, Settings, Download, Award, Star, Percent, Sun, Moon } from "lucide-react";
import { useDashboardResumen } from "@/hooks/useDashboardResumen";
import { useCitas } from "@/hooks/useCitas";
import { useTransacciones } from "@/hooks/useTransacciones";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme, toggleTheme } = useTheme();
  const { citasCount, ingresos, gastos, loading } = useDashboardResumen();
  const { citas, loading: loadingCitas } = useCitas();
  const { transacciones, loading: loadingTransacciones } = useTransacciones();
  const { install, isInstallable } = useInstallPrompt();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [showSettings, setShowSettings] = useState(false);

  const insights = useMemo(() => {
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActualStr = String(ahora.getMonth() + 1).padStart(2, "0");
    const prefijoMesActual = `${anioActual}-${mesActualStr}`;

    // 1. Servicio Estrella
    const citasCompletadasEsteMes = citas.filter(
      (c) => c.estado === "completada" && c.fecha_hora && c.fecha_hora.startsWith(prefijoMesActual)
    );

    const conteoServicios: Record<string, number> = {};
    let servicioEstrella = "Ninguno";
    let maxServicios = 0;

    citasCompletadasEsteMes.forEach((c) => {
      const t = c.tratamiento;
      conteoServicios[t] = (conteoServicios[t] || 0) + 1;
      if (conteoServicios[t] > maxServicios) {
        maxServicios = conteoServicios[t];
        servicioEstrella = t;
      }
    });

    // 2. Día más Activo
    const citasEsteMes = citas.filter(
      (c) => c.fecha_hora && c.fecha_hora.startsWith(prefijoMesActual)
    );

    const conteoDias = Array(7).fill(0);
    citasEsteMes.forEach((c) => {
      const parts = c.fecha_hora.split("T")[0].split("-");
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const diaIndex = dateObj.getDay();
        if (!isNaN(diaIndex)) {
          conteoDias[diaIndex]++;
        }
      }
    });

    let maxDias = 0;
    let diaMasActivo = "Ninguno";
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    conteoDias.forEach((conteo, idx) => {
      if (conteo > maxDias) {
        maxDias = conteo;
        diaMasActivo = diasSemana[idx];
      }
    });

    // 3. Margen de Ganancia
    const margenGanancia = ingresos > 0 ? Math.round(((ingresos - gastos) / ingresos) * 100) : 0;

    return {
      servicioEstrella,
      maxServicios,
      diaMasActivo,
      maxDias,
      margenGanancia,
    };
  }, [citas, ingresos, gastos]);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported" | null>(null);
  const [saludo, setSaludo] = useState("¡Hola, Majo! ✨");

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) {
      setSaludo("¡Buenos días, Majo! ☀️");
    } else if (hora >= 12 && hora < 19) {
      setSaludo("¡Buenas tardes, Majo! ✨");
    } else {
      setSaludo("¡Buenas noches, Majo! 🌙");
    }
  }, []);

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
    <div className="flex min-h-full flex-col bg-background px-6 pt-8 pb-24 text-foreground">
      <OfflineIndicator />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            {saludo}
          </h1>
          <p className="text-sm text-muted mt-0.5">MajoSkin • Control de Cabina</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border transition-all active:scale-90"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5 text-gray-400" />
            ) : (
              <Sun className="h-5 w-5 text-amber-400" />
            )}
          </button>
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(20);
              }
              setShowSettings(true);
            }}
            aria-label="Abrir ajustes"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border transition-all active:scale-90"
          >
            <Settings className="h-5 w-5 text-muted" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-3xl bg-card border border-border px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-[0.98]"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-muted">{label}</p>
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

      {/* Sección de Insights */}
      <div className="mt-8 mb-6">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-primary" />
          Análisis de Cabina ✨
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Card: Servicio Estrella */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#FDFBF7] dark:from-[#1c1a16] dark:to-[#151310] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F4EFE6] dark:border-[#2a2419] transition-all hover:shadow-[0_6px_24px_rgba(212,175,55,0.08)] active:scale-[0.99]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Servicio Estrella</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Star className="h-4.5 w-4.5 fill-current" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">
              {loadingCitas ? "Cargando..." : insights.servicioEstrella}
            </p>
            <p className="text-xs text-muted mt-1">
              {loadingCitas ? "" : insights.maxServicios > 0 ? `${insights.maxServicios} citas completadas este mes` : "Sin citas registradas"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Card: Día más Activo */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#FAFAFA] dark:from-[#171716] dark:to-[#151514] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F5F5F5] dark:border-border transition-all active:scale-[0.99]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Día Activo</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#222221] text-gray-500">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-base font-bold text-foreground">
                {loadingCitas ? "..." : insights.diaMasActivo}
              </p>
              <p className="text-[10px] text-muted mt-1">
                {loadingCitas ? "" : insights.maxDias > 0 ? `${insights.maxDias} agendadas` : "Sin datos"}
              </p>
            </div>

            {/* Card: Margen de Ganancia */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#F6FCF8] dark:from-[#131916] dark:to-[#101513] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E6F4EA] dark:border-[#1e2a22] transition-all active:scale-[0.99]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-success uppercase tracking-wider">Margen Neto</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Percent className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-lg font-bold text-success">
                {loading ? "..." : `${insights.margenGanancia}%`}
              </p>
              <p className="text-[10px] text-muted mt-1">
                {loading ? "" : insights.margenGanancia >= 50 ? "¡Excelente rentabilidad! 🌟" : insights.margenGanancia > 0 ? "Margen operativo positivo" : "Aumenta tus ingresos 📈"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Ajustes"
      >
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wider">
            Notificaciones
          </p>
          <div className="flex items-center justify-between rounded-2xl bg-border/30 dark:bg-border/20 px-4 py-3 border border-border">
            <div className="flex items-center gap-3">
              {notifStatus === "granted" ? (
                <Bell className="h-5 w-5 text-success" />
              ) : (
                <BellOff className="h-5 w-5 text-muted" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {notifStatus === "granted" ? "Activadas" : notifStatus === "denied" ? "Bloqueadas" : notifStatus === "unsupported" ? "No soportado" : "Inactivas"}
                </p>
                <p className="text-xs text-muted">
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
