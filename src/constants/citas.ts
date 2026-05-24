export const TRATAMIENTOS = [
  "Limpieza Facial",
  "Hidratacion",
  "Radiofrecuencia",
  "Dermaplaning",
  "Micropigmentacion",
  "Otro",
] as const;

export const ESTADOS_CITA = ["pendiente", "completada", "cancelada"] as const;

export const BADGE_COLOR: Record<string, string> = {
  pendiente: "bg-primary/10 text-primary",
  completada: "bg-success/10 text-success",
  cancelada: "bg-danger/10 text-danger",
};
