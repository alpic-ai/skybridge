import Image from "next/image";

type Quote = { q: string; who: string; where: string; photo?: string };

const QUOTES: Quote[] = [
  {
    q: "In the past 24 hours I went from the template repo to three production-grade demos for our partners. Three. The way you've structured the Skybridge template is beautiful — extremely easy to leverage with Claude Opus and Codex.",
    who: "Asad Iqbal",
    where: "CTO · Noodle Seed",
    photo: "/assets/people/asad.webp",
  },
  {
    q: 'Skybridge\'s typed bridge between server tools and React widgets is the killer feature. useToolInfo<"my_tool">() knows exactly what our handler returns — server-side schema changes show up instantly as typecheck errors in the widget. Building MCP apps finally feels like building normal full-stack apps.',
    who: "Meir Kadosh",
    where: "AI Engineer · Brightdata",
    photo: "/assets/people/meir.webp",
  },
  {
    q: "Skybridge gave us a single typed runtime for both server tools and React widgets — same TS types, hot-reload, and one deploy step into Claude and ChatGPT. It's the first MCP framework that actually feels production-grade.",
    who: "Stefan Lederer",
    where: "CEO · Bitmovin",
    photo: "/assets/people/stefan.webp",
  },
  {
    q: "Skybridge was the obvious pick for our MCP stack. Even on the server side, where we're not yet using app view features, one cohesive runtime beats fragmenting our codebase across SDKs. And I've never seen a team ship fixes this fast.",
    who: "Axel Fournier",
    where: "Founding Engineer · Pletor",
    photo: "/assets/people/axel.webp",
  },
  {
    q: "Alpic and Skybridge made spinning up the Career Coach remarkably smooth. The MCP integration was clean, deployment was fast, and the developer experience was top-notch. Highly recommend their team!",
    who: "Adam M.",
    where: "CTO · Invirtus",
    photo: "/assets/people/adam.webp",
  },
  {
    q: "What sold us on Skybridge was how customizable the framework is, and how effective the type-safety is between the server and the frontend.",
    who: "Pierre-Loic de Schaetzen",
    where: "Software Engineer · Chift",
    photo: "/assets/people/pierre-loic.webp",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);

export function SBQuotes() {
  return (
    <section className="sb-section" id="quotes" style={{ paddingTop: 88 }}>
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Testimonials</div>
          <h2 className="sb-section-title">
            Loved by <span className="sb-accent">MCP App builders</span>
          </h2>
        </div>
        <div className="sb-quotes-social">
          {QUOTES.map((q, i) => (
            <article key={q.who} className="sb-quotes-social-card">
              <header className="sb-quotes-social-h">
                <div
                  className="sb-quotes-social-avatar"
                  data-i={i % 4}
                  aria-hidden
                >
                  {q.photo ? (
                    <Image
                      src={q.photo}
                      alt=""
                      width={88}
                      height={88}
                      loading="lazy"
                    />
                  ) : (
                    <span>{initials(q.who)}</span>
                  )}
                </div>
                <div className="sb-quotes-social-id">
                  <div className="sb-quotes-social-name">{q.who}</div>
                  <div className="sb-quotes-social-role">{q.where}</div>
                </div>
              </header>
              <p className="sb-quotes-social-q">{q.q}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
