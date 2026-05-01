/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
// worker/index.js
// next-pwa가 이 파일을 sw.js에 자동으로 합쳐줘요

self.addEventListener("push", event => {
  var _event$data$json, _event$data;
  const data = (_event$data$json = (_event$data = event.data) === null || _event$data === void 0 ? void 0 : _event$data.json()) !== null && _event$data$json !== void 0 ? _event$data$json : {};
  event.waitUntil(self.registration.showNotification(data.title || "새 메시지", {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/chat"
    }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then(list => {
    if (list.length > 0) return list[0].focus();
    return clients.openWindow(event.notification.data.url);
  }));
});
/******/ })()
;