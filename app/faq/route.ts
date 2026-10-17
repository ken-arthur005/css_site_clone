export function GET() {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow"><title>FAQs retired | CSS KNUST</title>
<style>body{margin:0;padding:clamp(2rem,8vw,8rem);background:#f7f8fc;color:#202532;font:1.125rem/1.6 sans-serif}main{max-width:40rem}h1{font-size:clamp(2.5rem,7vw,5rem);line-height:1.05;letter-spacing:-.04em}a{color:#245cc4;text-underline-offset:.2em}a:focus-visible{outline:2px solid #245cc4;outline-offset:4px}nav{display:flex;gap:1.5rem;flex-wrap:wrap}</style>
</head><body><main><p>Computer Science Society / KNUST</p><h1>This FAQ page has been retired.</h1>
<p>Explore the current website to learn about CSS and find your way around the society.</p>
<nav aria-label="Explore CSS"><a href="/">Home</a><a href="/about">About CSS</a><a href="/executives">Executives</a><a href="/events">Events</a><a href="/merch">Merch</a></nav>
</main></body></html>`, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" },
  });
}
