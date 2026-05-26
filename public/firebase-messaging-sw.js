// v7 - sound + strong click navigation
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
  const title = payload.data?.title ?? "새 메시지";
  const body  = payload.data?.body  ?? "";
  const url   = payload.data?.url   ?? "/home";

  self.registration.showNotification(title, {
    body,
    icon:     "/wag.png",
    badge:    "/wag.png",
    vibrate:  [200, 80, 200, 80, 400],
    tag:      `chat-${Date.now()}`,
    renotify: true,
    silent:   false,
    requireInteraction: false,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
  const fullUrl = self.location.origin + url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      return clients.openWindow(fullUrl);
    })
  );
});
