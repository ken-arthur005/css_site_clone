"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { MerchStoreContent } from "@/types/merch-store";
import { can, type StaffUser } from "./admin-api";
import { ActivityTab } from "./activity-tab";
import { AuditTab } from "./audit-tab";
import { BooksTab } from "./books-tab";
import { CountsTab } from "./counts-tab";
import { OrdersTab } from "./orders-tab";
import { PickupTab } from "./pickup-tab";
import { PrintingTab } from "./printing-tab";
import { SaleTab } from "./sale-tab";
import { SettingsTab } from "./settings-tab";
import { TextsTab } from "./texts-tab";

type Tab = { id: string; name: string; allowed: (user: StaffUser) => boolean; render: (user: StaffUser, content: MerchStoreContent) => ReactNode };

const TABS: Tab[] = [
  { id: "pickup", name: "Pickup desk", allowed: (u) => can(u, "sales.collect_order"), render: (u, c) => <PickupTab user={u} content={c} /> },
  { id: "orders", name: "Orders", allowed: (u) => can(u, "sales.view_order"), render: (u, c) => <OrdersTab user={u} content={c} /> },
  { id: "sale", name: "New sale", allowed: (u) => can(u, "sales.record_order"), render: (_u, c) => <SaleTab content={c} /> },
  { id: "printing", name: "Printing", allowed: (u) => can(u, "sales.manage_printing_order"), render: (_u, c) => <PrintingTab content={c} /> },
  { id: "counts", name: "Counts", allowed: (u) => can(u, "sales.view_order"), render: (_u, c) => <CountsTab content={c} /> },
  { id: "activity", name: "Activity", allowed: (u) => can(u, "sales.view_activityevent"), render: () => <ActivityTab /> },
  { id: "audit", name: "Audit", allowed: (u) => can(u, "sales.audit_order"), render: () => <AuditTab /> },
  { id: "texts", name: "Texts", allowed: (u) => can(u, "sales.bulk_sms_order") || can(u, "sales.view_notificationlog"), render: (u) => <TextsTab user={u} /> },
  { id: "books", name: "Books", allowed: (u) => can(u, "sales.view_expense") || can(u, "sales.view_accountedentry") || can(u, "sales.view_promocode"), render: (u) => <BooksTab user={u} /> },
  { id: "settings", name: "Settings", allowed: (u) => can(u, "sales.view_shopsettings"), render: (u) => <SettingsTab user={u} /> },
];

export function AdminApp({ user, content }: { user: StaffUser; content: MerchStoreContent }) {
  const tabs = useMemo(() => TABS.filter((tab) => tab.allowed(user)), [user]);
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fromUrl = () => { const id = new URLSearchParams(location.search).get("tab"); if (id && tabs.some((tab) => tab.id === id)) setActive(id); };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, [tabs]);

  function open(id: string) {
    setActive(id);
    const url = new URL(location.href); url.searchParams.set("tab", id);
    history.pushState(null, "", url);
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the cleared session takes effect
    location.assign("/admin/login");
  }

  const current = tabs.find((tab) => tab.id === active);
  return <div className="admin">
    <header className="admin__top">
      <div><p className="admin-label">CSS merch / Staff</p><h1>Dashboard</h1></div>
      <div className="admin__me"><span><strong>{user.name ?? user.username}</strong><small>{user.is_superuser ? "Superuser" : user.roles.join(", ") || "Staff"}</small></span><button type="button" className="admin-button admin-button--ghost" disabled={signingOut} onClick={() => void signOut()}>Sign out</button></div>
    </header>
    {tabs.length === 0 ? <p className="admin-empty">Your account has no merch permissions yet. Ask a merch admin to give you a role (Sales Desk, Treasurer or Merch Admin).</p> : <>
      <nav className="admin-tabs" aria-label="Dashboard sections">{tabs.map((tab) => <button key={tab.id} type="button" aria-current={tab.id === active ? "page" : undefined} onClick={() => open(tab.id)}>{tab.name}</button>)}</nav>
      <main className="admin__body" aria-label={current?.name}>{current?.render(user, content)}</main>
    </>}
  </div>;
}
