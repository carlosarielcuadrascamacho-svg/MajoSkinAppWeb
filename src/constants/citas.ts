export const TRATAMIENTOS = [
  "Limpieza Facial Profunda",
  "Depilación Piernas Completas",
  "Depilación 1/2 Piernas",
  "Depilación Brazos Completos",
  "Depilación Patillas",
  "Depilación Bozo (Bigote)",
  "Depilación Axilas",
  "Laminado + Diseño con Cera (Cejas)",
  "Laminado + Diseño con Pinzas (Cejas)",
  "Diseño de Cejas (Pinzas)",
  "Diseño de Cejas (Cera)",
  "Laminado de Cejas",
  "RF Lifting Experience",
  "Otro",
] as const;

export const ESTADOS_CITA = ["pendiente", "completada", "cancelada"] as const;

export const BADGE_COLOR: Record<string, string> = {
  pendiente: "bg-primary/10 text-primary",
  completada: "bg-success/10 text-success",
  cancelada: "bg-danger/10 text-danger",
};
