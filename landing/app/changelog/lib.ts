export const REPO = "alpic-ai/skybridge";
export const GITHUB_REPO_URL = `https://github.com/${REPO}`;

export type Release = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
};

let releasesPromise: Promise<Release[]> | null = null;

export function getReleases(): Promise<Release[]> {
  if (!releasesPromise) {
    releasesPromise = fetchReleases();
  }
  return releasesPromise;
}

async function fetchReleases(): Promise<Release[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=100`,
      { headers, cache: "force-cache" },
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Release[];
    return data
      .filter((r) => !r.draft && !r.prerelease)
      .sort((a, b) => {
        const aT = a.published_at ? Date.parse(a.published_at) : 0;
        const bT = b.published_at ? Date.parse(b.published_at) : 0;
        return bT - aT;
      });
  } catch {
    return [];
  }
}

export function slugifyTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

export function linkifyReferences(body: string): string {
  return body
    .replace(/(^|[\s(])#(\d+)\b/g, `$1[#$2](${GITHUB_REPO_URL}/pull/$2)`)
    .replace(
      /(^|[\s(])@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})?)\b/g,
      "$1[@$2](https://github.com/$2)",
    );
}

// Strip GitHub noise from a release body so the markdown is readable
// for LLMs and skimmers: @mentions, PR refs, the old `by @user in <url>`
// form, and conventional-commit prefixes.
export function cleanBodyForMarkdown(body: string): string {
  return body
    .replace(
      /^#{1,6}[ \t]+(Changes|What['’]?s?[ \t]+Changed|Changelog)[ \t]*\r?\n+/gim,
      "",
    )
    .replace(/^\*\*Full Changelog\*\*:.*$/gim, "")
    .replace(/[ \t]+by[ \t]+@[a-zA-Z0-9-]+[ \t]+in[ \t]+https?:\/\/\S+/g, "")
    .replace(/[ \t]*\(#\d+\)/g, "")
    .replace(/[ \t]+@[a-zA-Z0-9-]+\b/g, "")
    .replace(
      /^([ \t]*[-*][ \t]+)(?:feat|fix|chore|docs|ci|refactor|test|style|perf|build|revert)(?:\([^)]*\))?:[ \t]*/gim,
      (_, lead: string) => lead,
    )
    .replace(
      /^([ \t]*[-*][ \t]+)([a-z])/gm,
      (_, lead: string, ch: string) => `${lead}${ch.toUpperCase()}`,
    )
    .replace(
      /^(#{1,5})([ \t]+)/gm,
      (_, hashes: string, ws: string) => `#${hashes}${ws}`,
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitChanges(body: string): {
  intro: string;
  changes: string | null;
  count: number;
} {
  const match = body.match(
    /(^|\r?\n)#{1,6}[ \t]+(Changes|What['’]?s?[ \t]+Changed|Changelog)[ \t]*\r?\n+/i,
  );
  if (!match || match.index === undefined) {
    return { intro: body, changes: null, count: 0 };
  }
  const intro = body.slice(0, match.index).trim();
  const changes = body.slice(match.index + match[0].length).trim();
  const count = (changes.match(/^[ \t]*[-*][ \t]+/gm) ?? []).length;
  return { intro, changes, count };
}
