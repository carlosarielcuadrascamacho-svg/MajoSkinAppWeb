import { isSupported, getMessaging, getToken, onMessage } from "firebase/messaging";

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!("Notification" in window)) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return Notification.requestPermission();
}

export async function getFCMToken(vapidKey: string): Promise<string | null> {
  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch {
    return null;
  }
}

export function listenForMessages(callback: (payload: any) => void): (() => void) | null {
  try {
    const messaging = getMessaging();
    return onMessage(messaging, callback);
  } catch {
    return null;
  }
}
