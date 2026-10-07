const routeLabels: Record<string, string> = {
  "/": "HOME",
  "/about": "ABOUT",
  "/executives": "EXECUTIVES",
  "/events": "EVENTS",
  "/merch": "MERCH",
  "/merch/shop": "SHOP",
};

export function getRouteLabel(pathname: string, supplied?: string) {
  if (supplied?.trim()) return supplied.trim().toUpperCase();
  if (routeLabels[pathname]) return routeLabels[pathname];
  if (pathname.startsWith("/events/")) return "EVENT DETAIL";
  if (pathname.startsWith("/merch/order")) return "YOUR ORDER";
  return "CSS KNUST";
}
