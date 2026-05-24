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

export const PRECIOS_SUGERIDOS: Record<string, number> = {
  "Limpieza Facial Profunda": 300,
  "Depilación Piernas Completas": 300,
  "Depilación 1/2 Piernas": 250,
  "Depilación Brazos Completos": 200,
  "Depilación Patillas": 60,
  "Depilación Bozo (Bigote)": 50,
  "Depilación Axilas": 150,
  "Laminado + Diseño con Cera (Cejas)": 180,
  "Laminado + Diseño con Pinzas (Cejas)": 150,
  "Diseño de Cejas (Pinzas)": 80,
  "Diseño de Cejas (Cera)": 100,
  "Laminado de Cejas": 100,
};

export const ESTADOS_CITA = ["pendiente", "completada", "cancelada"] as const;

export const BADGE_COLOR: Record<string, string> = {
  pendiente: "bg-primary/10 text-primary",
  completada: "bg-success/10 text-success",
  cancelada: "bg-danger/10 text-danger",
};
