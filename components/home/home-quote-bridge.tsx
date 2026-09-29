type HomeQuoteBridgeProps = {
  author: string;
  quote: string;
};

export function HomeQuoteBridge({ author, quote }: HomeQuoteBridgeProps) {
  return (
    <section className="home-quote-bridge">
      <div className="page-shell home-quote-bridge__inner">
        <figure>
          <blockquote>{quote}</blockquote>
          <figcaption>{author}</figcaption>
        </figure>
      </div>
    </section>
  );
}
