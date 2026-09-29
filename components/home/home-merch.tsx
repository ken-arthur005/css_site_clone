import type { MerchProduct } from "@/types/merch";
import { HomeMerchSelector } from "./home-merch-selector";

export function HomeMerch({ product }: { product: MerchProduct | null }) {
  if (!product) return null;

  return (
    <section className="home-merch" aria-labelledby="merch-title">
      <HomeMerchSelector product={product} />
    </section>
  );
}
