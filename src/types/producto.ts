import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

export interface Producto {
  id: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
  creadoEn?: Timestamp;
}

export const productoConverter: FirestoreDataConverter<Producto> = {
  toFirestore(prod: Producto): DocumentData {
    const { id, ...data } = prod;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Producto {
    return { id: snapshot.id, ...snapshot.data() } as Producto;
  },
};
