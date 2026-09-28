import Image from "next/image";
import type { MerchProduct } from "@/types/merch";
import { HomeMerchSelector } from "./home-merch-selector";

export function HomeMerch({ product }: { product: MerchProduct | null }) {
  if (!product) return null;

  return (
    <section className="home-merch" aria-labelledby="merch-title">
      <div className="page-shell home-merch__layout">
        <div className="home-merch__image-field angular-cut">
          <Image
            alt="CSS Core Tee mockup in white with black print"
            className="home-merch__image"
            height={730}
            sizes="(max-width: 767px) 85vw, 45vw"
            src="/tshirt white-black.png"
            width={511}
          />
          <p className="eyebrow home-merch__image-label">Mockup / White + Black</p>
        </div>
        <div className="home-merch__content">
          <p className="eyebrow text-accent-strong">04 / Merch</p>
          <h2 className="home-section-title" id="merch-title">{product.name}</h2>
          <p className="editorial-type">{product.description}</p>
          <HomeMerchSelector product={product} />
        </div>
      </div>
    </section>
  );
}
