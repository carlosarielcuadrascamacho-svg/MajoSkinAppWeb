// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

// Inicializar la aplicación de Firebase en el Service Worker con la configuración de tu proyecto
firebase.initializeApp({
  apiKey: "AIzaSyCrbKod9edqQdrw2FOrT8DfBfQjDMHAMcc",
  authDomain: "majoadmin.firebaseapp.com",
  projectId: "majoadmin",
  storageBucket: "majoadmin.firebasestorage.app",
  messagingSenderId: "699999651985",
  appId: "1:699999651985:web:fe4d1fec3097a7c08fd730",
});

const messaging = firebase.messaging();

// Manejador de notificaciones recibidas en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensaje recibido en segundo plano:", payload);
  
  const notificationTitle = payload.notification?.title || "MajoSkin";
  const notificationOptions = {
    body: payload.notification?.body || "Nueva notificación de tu panel de administración.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
