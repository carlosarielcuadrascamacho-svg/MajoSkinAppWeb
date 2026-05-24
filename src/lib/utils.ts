export function formatearMonto(monto: number) {
  return `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}
