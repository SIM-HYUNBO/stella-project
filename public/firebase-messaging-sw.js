importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBBSM0axgA9iVrTpqpF31dmBSARajf6Xic",
  projectId: "wagchat-e17ae",
  messagingSenderId: "321656715514",
  appId: "1:321656715514:web:4eda4a7375b846a939b143",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "새 메시지";
  const body = payload.notification?.body ?? "";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: "fcm-bg",
    renotify: true,
    requireInteraction: false,
    data: { url: payload.fcmOptions?.link ?? "/home" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(url) : existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});
