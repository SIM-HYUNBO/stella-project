/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
self.addEventListener("push", event => {
  var _event$data$json, _event$data;
  const data = (_event$data$json = (_event$data = event.data) === null || _event$data === void 0 ? void 0 : _event$data.json()) !== null && _event$data$json !== void 0 ? _event$data$json : {};
  event.waitUntil(self.registration.showNotification(data.title || "새 메시지", {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    image: data.image || undefined,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || "chat-message",
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || "/home"
    }
  }));
});
self.addEventListener("notificationclick", event => {
  var _event$notification$d;
  event.notification.close();
  const url = ((_event$notification$d = event.notification.data) === null || _event$notification$d === void 0 ? void 0 : _event$notification$d.url) || "/home";
  event.waitUntil(clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then(list => {
    const existing = list.find(c => c.url.includes(self.location.origin));
    if (existing) {
      existing.focus();
      return existing.navigate ? existing.navigate(url) : existing.focus();
    }
    return clients.openWindow(url);
  }));
});
/******/ })()
;