import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";

const INTERVALOS = [
  { key: "24h", ms: 24 * 60 * 60 * 1000, label: "24 horas" },
  { key: "2h", ms: 2 * 60 * 60 * 1000, label: "2 horas" },
  { key: "1h", ms: 1 * 60 * 60 * 1000, label: "1 hora" },
] as const;

const TOLERANCIA_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = getAdminDb();
  const messaging = getAdminMessaging();

  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens: string[] = [];
  tokensSnap.forEach((d) => {
    const t = d.data().token;
    if (t) tokens.push(t);
  });

  if (tokens.length === 0) {
    return NextResponse.json({ enviados: 0 });
  }

  const citasSnap = await db
    .collection("citas")
    .where("estado", "==", "pendiente")
    .get();

  const ahora = Date.now();
  let enviados = 0;

  for (const doc of citasSnap.docs) {
    const cita = doc.data();
    if (!cita.fecha_hora) continue;

    const citaDate = new Date(cita.fecha_hora).getTime();
    if (isNaN(citaDate)) continue;

    const diffMs = citaDate - ahora;
    const recordatorios = cita.recordatorios ?? {};

    for (const intervalo of INTERVALOS) {
      if (recordatorios[intervalo.key]) continue;

      const diffTarget = Math.abs(diffMs - intervalo.ms);
      if (diffTarget > TOLERANCIA_MS) continue;

      const messages = tokens.map((token) => ({
        notification: {
          title: `⏰ ${cita.cliente_nombre || "Cita"} en ${intervalo.label}`,
          body: `${cita.cliente_nombre || "Clienta"} - ${cita.tratamiento || "Sin tratamiento"}`,
        },
        token,
      }));

      try {
        const resp = await messaging.sendEach(messages);
        enviados += resp.successCount;
      } catch {
        continue;
      }

      await doc.ref.update({
        [`recordatorios.${intervalo.key}`]: true,
      });
    }
  }

  return NextResponse.json({ enviados });
}
