"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminApi, can, type StaffUser } from "./admin-api";

export function SettingsTab({ user }: { user: StaffUser }) {
  const [pickupInfo, setPickupInfo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editable = can(user, "sales.change_shopsettings");

  useEffect(() => {
    adminApi<{ pickup_info: string }>("settings/").then((data) => { setPickupInfo(data.pickup_info); setLoaded(true); }).catch((failure) => setError(failure.message));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(""); setError("");
    try { await adminApi("settings/", { method: "PATCH", body: { pickup_info: pickupInfo } }); setMessage("Saved. New texts and emails use it straight away."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save."); }
  }

  return <div className="admin-stack">
    <form className="admin-card admin-form" onSubmit={save}>
      <h3>Pickup details</h3>
      <p className="admin-muted">Where and when buyers collect. It goes into the “ready for pickup” text and the confirmation email. Keep it short: texts allow about 300 characters in total.</p>
      <label>Pickup details<textarea rows={3} maxLength={220} value={pickupInfo} disabled={!loaded || !editable} onChange={(event) => setPickupInfo(event.target.value)} placeholder="e.g. CSS office, Science block, Mon–Fri 2–5pm" /></label>
      <p className="admin-muted">{pickupInfo.length}/220</p>
      {editable && <button type="submit" className="admin-button" disabled={!loaded}>Save</button>}
      <p className="admin-ok" role="status">{message}</p>
      <p className="admin-error" role="alert">{error}</p>
    </form>
    <section className="admin-card">
      <h3>More settings</h3>
      <p className="admin-muted">Products, prices, sizes, colourways, back designs and bundles are managed in the Django admin. The desk QR code is on the Pickup desk tab.</p>
    </section>
  </div>;
}
