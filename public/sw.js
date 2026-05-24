const CACHE = "majoadmin-v1";

const urlsToCache = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-icon-180.png",
];

try {
  importScripts(
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js"
  );

  firebase.initializeApp({
    apiKey: "AIzaSyCrbKod9edqQdrw2FOrT8DfBfQjDMHAMcc",
    authDomain: "majoadmin.firebaseapp.com",
    projectId: "majoadmin",
    storageBucket: "majoadmin.firebasestorage.app",
    messagingSenderId: "699999651985",
    appId: "1:699999651985:web:fe4d1fec3097a7c08fd730",
  });

  const messaging = firebase.messaging();

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || "MajoAdmin";
    const notificationOptions = {
      body: payload.notification?.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log("FCM no disponible, notificaciones push desactivadas:", e);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.method !== "GET" ||
    request.url.startsWith("chrome-extension://")
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cacheCopy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, cacheCopy));
          return response;
        })
        .catch(() =>
          caches.match("/").then((cached) => {
            if (cached) return cached;
            return caches.match("/index.html");
          })
            .then((cached) => cached || new Response("Sin conexión", { status: 503 }))
        )
    );
    return;
  }

  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, cacheCopy));
          }
          return response;
        });
        return cached ?? fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
