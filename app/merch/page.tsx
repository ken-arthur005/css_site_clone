import type { Metadata } from "next";
import { MerchHero } from "@/components/merch/merch-hero";
import { MerchImage } from "@/components/merch/merch-image";
import { MerchPink } from "@/components/merch/merch-pink";
import { MerchOrderLink, MerchShowcase } from "@/components/merch/merch-showcase";
import { MerchTour } from "@/components/merch/merch-tour";
import { getMerchStore } from "@/lib/content/merch-store";
import { getSiteInfo } from "@/lib/content/site";
import { money } from "@/lib/merch/order";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteInfo();
  const canonical = site.canonicalOrigin.contentStatus === "verified" ? new URL("/merch", site.canonicalOrigin.value).href : undefined;
  return { title: "Wear the society — CSS KNUST Merch", description: "Explore the CSS Tee in six colourways and the Pink October Tee. Choose your fit and size; get 5% off when you buy two or more tees.",
    ...(canonical ? { alternates: { canonical }, openGraph: { url: canonical, images: [{ url: new URL("/merch/mockups/black-magenta.jpg", site.canonicalOrigin.value).href }] } } : {}) };
}

export default async function MerchPage() {
  const content = await getMerchStore();
  const [tee, pink] = content.products;
  return <main className="merch-page">
    <MerchShowcase colourways={tee.colourways}>
      <nav className="merch-index" aria-label="Merch sections"><a href="#shop">Shop</a><a href="#pink-october">Pink October</a><a href="#lookbook">Lookbook</a><a href="#merch-readme">README</a><MerchOrderLink className="merch-index__order">Start an order ↗</MerchOrderLink></nav>
      <MerchHero modelProduct={content.modelProduct} colourways={tee.colourways} />
      <div className="merch-band" aria-hidden="true"><div>{[0, 1, 2, 3].map((index) => <span key={index}>Computer Science Society <i>✳</i> Compile your fit <i>✳</i> Wear the society <i>✳</i></span>)}</div></div>
      <section className="merch-manifesto" aria-label="More than a tee">
        <ul>{content.features.map((feature, index) => <li key={feature}><span aria-hidden="true">{["✳", "</>", "⌂", "☕"][index]}</span>{feature}</li>)}</ul>
        <p data-merch-reveal>{content.manifesto} <em>Now on a tee.</em></p>
      </section>
      <MerchTour story={content.story} />
      <section className="merch-shop-section" id="shop" aria-labelledby="shop-title">
        <div className="merch-section-heading" data-merch-reveal data-merch-bot-anchor="shop"><div><p className="merch-label">02 / The collection</p><h2 id="shop-title">The shop<span>.</span></h2></div><p>Two tees. No complicated choices.<br />Choose your colours, find your fit, wear CSS.</p></div>
        <p className="merch-offer"><span aria-hidden="true">↳</span> Good things come in twos. <strong>Any 2+ tees. 5% off.</strong></p>
        <div className="merch-product-grid">{content.products.map((product) => <article className="merch-product" key={product.id} data-merch-reveal>
          <MerchOrderLink product={product.id} availableUntil={product.availableUntil} className={`merch-product__image ${product.id === "pink-october" ? "merch-product__image--pink" : ""}`}>
            <span className="merch-label merch-product__tag">{product.id === "pink-october" ? "October edition" : "Six colourways"}</span>
            <MerchImage src={product.colourways[0].front} alt={product.name} />
            <span className="merch-product__arrow" aria-hidden="true">↗</span>
          </MerchOrderLink>
          <div className="merch-product__meta"><div><h3><MerchOrderLink product={product.id} availableUntil={product.availableUntil}>{product.name}</MerchOrderLink></h3><p>{product.description}</p></div><p>From <strong>{money(product.priceMinor)}</strong></p></div>
        </article>)}</div>
      </section>
      <MerchPink facts={content.facts} availableUntil={pink.availableUntil!} />
      <section className="merch-lookbook" id="lookbook" aria-labelledby="lookbook-title">
        <div className="merch-section-heading" data-merch-reveal><div><p className="merch-label">03 / Find your colour</p><h2 id="lookbook-title">The<br />lookbook<span>.</span></h2></div><p>Six official colourways.<br />Pick the one that feels like you.</p></div>
        <div className="merch-lookbook__grid">{tee.colourways.map((colourway, index) => <MerchOrderLink key={colourway.id} colourwayId={colourway.id} className="merch-lookbook__item">
          <div className="merch-lookbook__photo"><MerchImage src={colourway.photo} alt={`${colourway.name}: ${colourway.base} CSS Tee with ${colourway.print} print, front and back`} sizes="(max-width: 600px) 90vw, (max-width: 1023px) 45vw, 30vw" /></div>
          <div className="merch-lookbook__caption"><span className="merch-label">0{index + 1}</span><div><strong>{colourway.name}</strong><span>{colourway.base} / {colourway.print} print</span></div><span aria-hidden="true">↗</span></div>
        </MerchOrderLink>)}</div>
      </section>
      <section className="merch-readme" id="merch-readme" aria-labelledby="readme-title"><div><p className="merch-label">04 / Read before you run</p><h2 id="readme-title">README<span>_</span></h2><p>A few useful answers.<br />Then you’re good to ship.</p></div><div className="merch-faq">{content.faq.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></section>
    </MerchShowcase>
  </main>;
}
