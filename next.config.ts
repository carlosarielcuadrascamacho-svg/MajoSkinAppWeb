import type { NextConfig } from "next";
import os from "os";

// Detectar dinámicamente las IPs de red local del ordenador para que funcione en cualquier Wi-Fi/Red
const getLocalIPs = () => {
  const ips: string[] = ["localhost", "127.0.0.1"];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (netInterface) {
        for (const net of netInterface) {
          // Filtrar por IPv4 y que no sea loopback interno (127.0.0.1)
          if ((net.family === "IPv4" || (net.family as any) === 4) && !net.internal) {
            ips.push(net.address);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error obteniendo IPs locales:", e);
  }
  return ips;
};

const devOrigins = getLocalIPs();

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com wss://firestore.googleapis.com https://apis.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://fcm.googleapis.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.firebase.com https://apis.google.com",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp.join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
