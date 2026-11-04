import type { Metadata } from "next";
import { MerchMyOrders } from "@/components/merch/merch-my-orders";

export const metadata: Metadata = { title: "My orders — CSS KNUST Merch", description: "Find your CSS KNUST merch orders, receipts and pickup codes with your phone number.", robots: { index: false, follow: false } };

export default function MyOrdersPage() {
  return <main className="merch-order-page"><MerchMyOrders /></main>;
}
