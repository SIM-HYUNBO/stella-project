self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "새 메시지", {
      body: data.body || "",
      icon: "/favicon.png",
      badge: "/favicon.png",
      image: data.image || undefined,
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || "chat-message",
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url: data.url || "/home" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
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
