/* かぞくチャット service worker: push notifications only (no fetch interception) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let data = { title: "かぞくチャット", body: "新しいメッセージがあります" };
  try { const j = e.data && e.data.json(); if (j && (j.title || j.body)) data = { title: j.title || data.title, body: j.body || data.body }; } catch (err) {}
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const looking = wins.some(w => w.url.includes("famchat.html") && w.visibilityState === "visible");
    if (looking) return; // already reading the chat: no need to notify
    try { if (self.navigator && "setAppBadge" in self.navigator) await self.navigator.setAppBadge(1); } catch (err) {}
    await self.registration.showNotification(data.title, { body: data.body, tag: "famchat-new", data: { url: "famchat.html" } });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    try { if (self.navigator && "clearAppBadge" in self.navigator) await self.navigator.clearAppBadge(); } catch (err) {}
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = wins.find(x => x.url.includes("famchat.html"));
    if (w) { try { await w.focus(); } catch (err) {} }
    else { try { await self.clients.openWindow("famchat.html"); } catch (err) {} }
  })());
});
