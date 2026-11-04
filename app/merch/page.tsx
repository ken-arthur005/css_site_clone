import type { Metadata } from "next";
import { MerchHero } from "@/components/merch/merch-hero";
import { MerchImage } from "@/components/merch/merch-image";
import { MerchPink } from "@/components/merch/merch-pink";
import { MerchLiveOffer, MerchLivePrice, MerchOrderLink, MerchShowcase } from "@/components/merch/merch-showcase";
import { MerchTour } from "@/components/merch/merch-tour";
import { MerchTyping } from "@/components/merch/merch-typing";
import { MerchSectionNav } from "@/components/merch/merch-section-nav";
import { MerchCyclingProduct } from "@/components/merch/merch-cycling-product";
import { getMerchStore } from "@/lib/content/merch-store";
import { getPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata({
    title: "Merch | CSS KNUST — Wear the society",
    description: "The CSS Tee in six colourways with two back designs, the General Lacoste and money-saving bundles. Choose your colours, back, fit and size, and pay with Mobile Money or card.",
    path: "/merch",
    image: { src: "/merch/mockups/black-magenta.jpg", alt: "CSS Tee with magenta print on black fabric" },
  });
}

export default async function MerchPage() {
  const content = await getMerchStore();
  const tee = content.products.find(({ id }) => id === "css-tee")!;
  const pink = content.products.find(({ id }) => id === "pink-october")!;
  const garments = content.products.filter(({ kind }) => kind !== "bundle");
  const bundles = content.products.filter(({ kind }) => kind === "bundle");
  const front = (id: string) => content.products.find((item) => item.id === id)?.colourways[0]?.front;
  return <main className="merch-page">
    <MerchShowcase colourways={tee.colourways}>
      <MerchSectionNav />
      <MerchHero modelProduct={content.modelProduct} colourways={tee.colourways} />
      <div className="merch-band" aria-hidden="true"><div>{[0, 1, 2, 3].map((index) => <span key={index}>Computer Science Society <i>✳</i> Compile your fit <i>✳</i> Wear the society <i>✳</i></span>)}</div></div>
      <section className="merch-manifesto" aria-label="More than a tee">
        <ul>{content.features.map((feature, index) => <li key={feature}><span aria-hidden="true">{["✳", "</>", "⌂", "☕"][index]}</span>{feature}</li>)}</ul>
        <p><MerchTyping duration={3.5}>{content.manifesto} <em>Now on a tee.</em></MerchTyping></p>
      </section>
      <MerchTour story={content.story} />
      <section className="merch-shop-section" id="shop" aria-labelledby="shop-title">
        <div className="merch-section-heading" data-merch-bot-anchor="shop"><div><p className="merch-label">02 / The collection</p><h2 id="shop-title"><MerchTyping>The shop<span>.</span></MerchTyping></h2></div><p>The tee, the polo, the bundles.<br />Choose your colours, find your fit, wear CSS.</p></div>
        <MerchLiveOffer />
        <div className="merch-product-grid">{garments.map((product) => product.id === "css-tee" ? <MerchCyclingProduct key={product.id} product={product} /> : <article className="merch-product" key={product.id} data-merch-reveal>
          <MerchOrderLink product={product.id} availableUntil={product.availableUntil} className={`merch-product__image ${product.id === "pink-october" ? "merch-product__image--pink" : ""}`}>
            <span className="merch-label merch-product__tag">{product.id === "pink-october" ? "October edition" : product.group === "polos" ? "The polo" : "Six colourways"}</span>
            <MerchImage src={product.colourways[0].front} alt={product.name} />
            <span className="merch-product__arrow" aria-hidden="true">↗</span>
          </MerchOrderLink>
          <div className="merch-product__meta"><div><h3><MerchOrderLink product={product.id} availableUntil={product.availableUntil}>{product.name}</MerchOrderLink></h3><p>{product.description}</p></div><MerchLivePrice product={product.id} /></div>
        </article>)}</div>
        <div className="merch-bundles" aria-labelledby="bundles-title">
          <div className="merch-bundles__heading"><p className="merch-label">Bundles</p><h3 id="bundles-title">Better together.</h3><p>Flat prices, every piece in the colour and size you choose.</p></div>
          <div className="merch-bundles__grid">{bundles.map((bundle) => <article className="merch-bundle" key={bundle.id} data-merch-reveal>
            <MerchOrderLink product={bundle.id} availableUntil={bundle.availableUntil} className="merch-bundle__image" ariaLabel={`Build the ${bundle.name} bundle`}>
              {bundle.badge && <span className="merch-label merch-product__tag">{bundle.badge}</span>}
              {bundle.pieces?.map((piece) => { const src = piece.back ? content.products.find((item) => item.id === piece.productId)?.colourways[0]?.backs?.[piece.back] : front(piece.productId); return src ? <span key={piece.slot}><MerchImage src={src} alt="" sizes="(max-width: 767px) 30vw, 12vw" /></span> : null; })}
            </MerchOrderLink>
            <div className="merch-product__meta"><div><h4><MerchOrderLink product={bundle.id} availableUntil={bundle.availableUntil}>{bundle.name}</MerchOrderLink></h4><p>{bundle.pieces?.map((piece) => piece.label).join(" + ")}</p></div><MerchLivePrice product={bundle.id} /></div>
          </article>)}</div>
        </div>
      </section>
      <MerchPink facts={content.facts} availableUntil={pink.availableUntil!} />
      <section className="merch-lookbook" id="lookbook" aria-labelledby="lookbook-title">
        <div className="merch-section-heading"><div><p className="merch-label">03 / Find your colour</p><h2 id="lookbook-title"><MerchTyping>The<br />lookbook<span>.</span></MerchTyping></h2></div><p>Six official colourways.<br />Pick the one that feels like you.</p></div>
        <div className="merch-lookbook__grid">{tee.colourways.map((colourway, index) => <MerchOrderLink key={colourway.id} colourwayId={colourway.id} className="merch-lookbook__item">
          <div className="merch-lookbook__photo"><MerchImage src={colourway.photo} alt={`${colourway.name}: ${colourway.base} CSS Tee with ${colourway.print} print, front and back`} sizes="(max-width: 600px) 90vw, (max-width: 1023px) 45vw, 30vw" /></div>
          <div className="merch-lookbook__caption"><span className="merch-label">0{index + 1}</span><div><strong>{colourway.name}</strong><span>{colourway.base} / {colourway.print} print</span></div><span aria-hidden="true">↗</span></div>
        </MerchOrderLink>)}</div>
      </section>
      <section className="merch-readme" id="merch-readme" aria-labelledby="readme-title"><div><p className="merch-label">04 / Read before you run</p><h2 id="readme-title"><MerchTyping>README<span>_</span></MerchTyping></h2><p>A few useful answers.<br />Then you’re good to ship.</p></div><div className="merch-faq">{content.faq.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></section>
    </MerchShowcase>
  </main>;
}
