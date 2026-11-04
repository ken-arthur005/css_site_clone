"use client";

import { useEffect, useState } from "react";

const FOLLOWED = "css-merch-push-orders";

type State = "hidden" | "ready" | "working" | "on" | "blocked" | "error";

function followed(): string[] {
  try { const value = JSON.parse(localStorage.getItem(FOLLOWED) ?? "[]"); return Array.isArray(value) ? value.filter((id) => typeof id === "string") : []; }
  catch { return []; }
}

function remember(id: string) {
  try { localStorage.setItem(FOLLOWED, JSON.stringify([...new Set([...followed(), id])].slice(-60))); } catch { /* private mode: still subscribed */ }
}

/** The VAPID key as the bytes PushManager.subscribe wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** "Notify me on this phone": optional web push on top of the texts we send. */
export function MerchNotify({ orderId }: { orderId: string }) {
  const [state, setState] = useState<State>("hidden");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supported()) return;
    let cancelled = false;
    fetch("/api/merch/push").then((response) => response.json()).then((data: { enabled?: boolean; publicKey?: string }) => {
      if (cancelled || !data.enabled || !data.publicKey) return;
      setKey(data.publicKey);
      if (Notification.permission === "denied") setState("blocked");
      else setState(Notification.permission === "granted" && followed().includes(orderId) ? "on" : "ready");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [orderId]);

  async function turnOn() {
    setState("working"); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "ready"); return; }
      const registration = await navigator.serviceWorker.register("/merch/sw.js", { scope: "/merch/" });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
      const response = await fetch("/api/merch/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON(), orders: [orderId] }) });
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "");
      remember(orderId);
      setState("on");
    } catch (failure) {
      setState("error");
      setMessage(failure instanceof Error && failure.message ? failure.message : "Notifications couldn’t be turned on. You’ll still get our texts.");
    }
  }

  if (state === "hidden") return null;
  return <div className="merch-notify">
    {state === "on"
      ? <p role="status"><strong>Notifications are on.</strong> This phone will buzz when your order is printing, ready and collected.</p>
      : state === "blocked"
        ? <p>Notifications are blocked for this site. You’ll still get our texts. To turn them on, allow notifications in your browser settings.</p>
        : <>
          <p>Get a notification on this phone as your order moves along: printing, ready, collected. Texts still come either way.</p>
          <button type="button" className="merch-button merch-button--secondary" disabled={state === "working"} onClick={() => void turnOn()}>{state === "working" ? "Turning on…" : "Notify me on this phone"}</button>
        </>}
    {message && <p className="merch-form-error" role="alert">{message}</p>}
  </div>;
}
