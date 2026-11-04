"use client";

import { useState, type FormEvent } from "react";

export function AdminLogin({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message ?? "Sign-in failed.");
      location.assign(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-in failed."); setBusy(false); }
  }

  return <form className="admin-login admin-card admin-form" onSubmit={submit}>
    <p className="admin-label">CSS merch / Staff</p>
    <h1>Sign in</h1>
    <p className="admin-muted">Use your own CSS staff account. Ask a merch admin if you don’t have one.</p>
    <label>Username<input name="username" autoComplete="username" required maxLength={150} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    <button type="submit" className="admin-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="admin-error" role="alert">{error}</p>
  </form>;
}
