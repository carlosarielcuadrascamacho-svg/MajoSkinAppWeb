"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js");
      } else {
        // En desarrollo, desregistrar cualquier Service Worker activo automáticamente
        // para evitar conflictos de caché con los chunks de Next.js HMR/Turbopack.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("Service Worker desregistrado automáticamente en desarrollo.");
                window.location.reload();
              }
            });
          }
        });
      }
    }
  }, []);

  return null;
}
