// ponytail: single source for the PH link; swap when the launch post is live
const PH_URL =
  "https://www.producthunt.com/products/skybridge?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-skybridge";

export function ProductHuntBanner() {
  return (
    <a className="sb-ph-banner" href={PH_URL} target="_blank" rel="noreferrer">
      <span className="sb-ph-emoji" aria-hidden="true">
        🚀
      </span>
      <span>
        We're live on Product Hunt today, help us reach Product of the Day
      </span>
      <span className="sb-ph-cta">Upvote →</span>
    </a>
  );
}
