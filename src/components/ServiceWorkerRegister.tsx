"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js");
      } else {
        // En desarrollo, desregistrar solo el Service Worker de almacenamiento (/sw.js)
        // para evitar conflictos de caché con HMR de Next.js/Turbopack, sin tocar 
        // el Service Worker de Firebase Cloud Messaging (/firebase-messaging-sw.js).
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
            if (scriptURL.includes("sw.js") && !scriptURL.includes("firebase-messaging-sw.js")) {
              registration.unregister().then((success) => {
                if (success) {
                  console.log("Service Worker de almacenamiento desregistrado automáticamente en desarrollo.");
                  window.location.reload();
                }
              });
            }
          }
        });
      }
    }
  }, []);

  return null;
}
