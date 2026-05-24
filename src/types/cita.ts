import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

export interface Cita {
  id: string;
  cliente_nombre: string;
  tratamiento: string;
  fecha_hora: string;
  notas: string;
  estado: string;
  creadoEn?: Timestamp;
  recordatorios?: Record<string, boolean>;
}

export const citaConverter: FirestoreDataConverter<Cita> = {
  toFirestore(cita: Cita): DocumentData {
    const { id, ...data } = cita;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Cita {
    return { id: snapshot.id, ...snapshot.data() } as Cita;
  },
};
