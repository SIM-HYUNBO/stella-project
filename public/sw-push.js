// public/sw-push.js
// 이 파일을 public/sw-push.js 로 저장하세요

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "새 메시지", {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/chat" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(event.notification.data.url);
    })
  );
});