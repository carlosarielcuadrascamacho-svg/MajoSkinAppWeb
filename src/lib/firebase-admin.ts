import "server-only";

import admin from "firebase-admin";

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Falta variable de entorno: FIREBASE_SERVICE_ACCOUNT");
  }
  return JSON.parse(raw);
}

function app(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const sa = getServiceAccount();

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminApp() {
  return app();
}

export function getAdminDb() {
  return admin.firestore(getAdminApp());
}

export function getAdminMessaging() {
  return admin.messaging(getAdminApp());
}
