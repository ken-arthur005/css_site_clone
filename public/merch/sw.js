/* CSS Merch web push: shows order updates and opens the order when tapped. */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = typeof data.title === "string" ? data.title : "CSS Merch";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === "string" ? data.body : "Your order has an update.",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    icon: "/css_logo-nobg.png",
    badge: "/css_logo-nobg.png",
    data: { url: typeof data.url === "string" ? data.url : "/merch/orders" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/merch/orders", self.location.origin);
  // Only ever open this site's pages.
  const url = target.origin === self.location.origin ? target.href : new URL("/merch/orders", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url === url && "focus" in client) return client.focus();
    }
    return self.clients.openWindow(url);
  })());
});
