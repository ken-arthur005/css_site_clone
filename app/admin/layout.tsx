import type { Metadata } from "next";
import "../merch/merch.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Staff — CSS KNUST Merch",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
