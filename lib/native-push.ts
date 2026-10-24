import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export const isAndroidApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
let registration: Promise<string | null> | null = null;
export async function nativePushPermission(request = false) {
  let permission = await PushNotifications.checkPermissions();
  if (request && ["prompt", "prompt-with-rationale"].includes(permission.receive)) permission = await PushNotifications.requestPermissions();
  return permission.receive;
}
export async function nativePushToken(request = false): Promise<string | null> {
  if (registration) return registration;
  registration = (async () => {
    if (await nativePushPermission(request) !== "granted") return null;
    await PushNotifications.createChannel({ id: "wagie_messages_v1", name: "와기 메시지", importance: 4, sound: "alert1.mp3", vibration: true, visibility: 0 });
    const handles: PluginListenerHandle[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resolveToken!: (token: string) => void;
    let rejectToken!: (error: Error) => void;
    const result = new Promise<string>((resolve, reject) => { resolveToken = resolve; rejectToken = reject; });
    void result.catch(() => {});
    try {
      handles.push(await PushNotifications.addListener("registration", token => resolveToken(token.value)));
      handles.push(await PushNotifications.addListener("registrationError", () => rejectToken(Error("알림 서버에 연결하지 못했어."))));
      timer = setTimeout(() => rejectToken(Error("알림 연결이 늦어지고 있어. 잠시 후 다시 켜 줘.")), 20000);
      await PushNotifications.register();
      return await result;
    } finally { clearTimeout(timer); await Promise.all(handles.map(handle => handle.remove())); }
  })();
  try { return await registration; } finally { registration = null; }
}
export async function stopNativePush() {
  if (!isAndroidApp()) return;
  if (registration) await registration.catch(() => {});
  await PushNotifications.unregister();
  await PushNotifications.removeAllDeliveredNotifications();
}
export function notificationPath(value: unknown): string | null {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value) ? value : null;
}
