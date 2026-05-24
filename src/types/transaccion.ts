import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

export interface Transaccion {
  id: string;
  tipo: "ingreso" | "gasto";
  descripcion: string;
  monto: number;
  creadoEn?: Timestamp;
}

export const transaccionConverter: FirestoreDataConverter<Transaccion> = {
  toFirestore(t: Transaccion): DocumentData {
    const { id, ...data } = t;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Transaccion {
    return { id: snapshot.id, ...snapshot.data() } as Transaccion;
  },
};
