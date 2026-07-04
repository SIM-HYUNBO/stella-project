// v8 - app badge support
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
  // webpush.notification이 FCM SDK에 의해 자동으로 알림을 표시하므로
  // 여기서 showNotification을 호출하면 이중 알림이 발생 → 배지만 처리
  self.registration.setAppBadge?.().catch?.(() => {});
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // 알림 클릭 시 배지 제거 (앱이 열리면 AppBadge 컴포넌트가 정확한 값으로 재설정)
  self.registration.clearAppBadge?.().catch?.(() => {});
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
