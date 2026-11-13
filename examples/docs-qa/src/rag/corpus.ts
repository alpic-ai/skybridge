// The corpus is the live Skybridge documentation. Mintlify serves an index of
// every page at /llms.txt and each page as raw markdown at <page-url>.md, so
// we ingest at runtime instead of shipping a stale snapshot of the docs.
const DOCS_INDEX_URL = "https://docs.skybridge.tech/llms.txt";

export type DocChunk = {
  /** Position in the corpus; stable for one index build. */
  id: number;
  pageTitle: string;
  /** H2 section heading, or null for a page's intro. */
  section: string | null;
  /** Deep link to the section on docs.skybridge.tech. */
  url: string;
  text: string;
};

type DocPage = {
  title: string;
  /** Human-facing page URL (no .md). */
  url: string;
  markdownUrl: string;
};

// Sections longer than this get split on paragraph boundaries so each
// embedding stays focused on one idea.
const MAX_CHUNK_CHARS = 2000;
// Post-cleanup fragments shorter than this are navigation noise, not content.
const MIN_CHUNK_CHARS = 80;

function parseIndex(llmsTxt: string): DocPage[] {
  const pages: DocPage[] = [];
  for (const line of llmsTxt.split("\n")) {
    const match = line.match(/^- \[(.+?)\]\((https:\/\/[^)\s]+?)\.md\)/);
    if (match) {
      pages.push({
        title: match[1],
        url: match[2],
        markdownUrl: `${match[2]}.md`,
      });
    }
  }
  return pages;
}

/** Mintlify heading anchors: lowercased, punctuation dropped, spaces dashed. */
function anchorFor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Raw page markdown embeds Mintlify components (cards, frames, callouts).
// Cards and frames are navigation chrome; callouts carry real prose, so they
// are unwrapped rather than dropped.
function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/<CardGroup[\s\S]*?<\/CardGroup>/g, "")
    .replace(/<Card[\s\S]*?<\/Card>/g, "")
    .replace(/<Frame[\s\S]*?<\/Frame>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/^\s*<\/?[A-Z][a-zA-Z]*[^>]*>\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongSection(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }
  const pieces: string[] = [];
  let current = "";
  for (const paragraph of text.split("\n\n")) {
    if (current && current.length + paragraph.length + 2 > MAX_CHUNK_CHARS) {
      pieces.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) {
    pieces.push(current);
  }
  return pieces;
}

function chunkPage(page: DocPage, markdown: string): Omit<DocChunk, "id">[] {
  // Drop the "Documentation Index" preamble Mintlify prepends before the H1.
  const h1Start = markdown.search(/^# /m);
  const body = h1Start === -1 ? markdown : markdown.slice(h1Start);

  const pageTitle = body.match(/^# (.+)$/m)?.[1].trim() ?? page.title;
  const afterTitle = body.replace(/^# .+$/m, "");

  const chunks: Omit<DocChunk, "id">[] = [];
  const sections = afterTitle.split(/^## /m);

  // sections[0] is the page intro; the rest each start with their heading line.
  for (const [index, raw] of sections.entries()) {
    let section: string | null = null;
    let content = raw;
    if (index > 0) {
      const newline = raw.indexOf("\n");
      section = (newline === -1 ? raw : raw.slice(0, newline)).trim();
      content = newline === -1 ? "" : raw.slice(newline + 1);
    }
    const cleaned = cleanMarkdown(content);
    if (cleaned.length < MIN_CHUNK_CHARS) {
      continue;
    }
    const url = section ? `${page.url}#${anchorFor(section)}` : page.url;
    for (const text of splitLongSection(cleaned)) {
      // Splitting can leave a stub tail (a stray closing line, a link);
      // embedding those only adds noise to retrieval.
      if (text.length >= MIN_CHUNK_CHARS) {
        chunks.push({ pageTitle, section, url, text });
      }
    }
  }
  return chunks;
}

/** Fetch every docs page and chunk it by section. */
export async function loadCorpus(): Promise<DocChunk[]> {
  const indexResponse = await fetch(DOCS_INDEX_URL);
  if (!indexResponse.ok) {
    throw new Error(
      `Failed to fetch docs index (HTTP ${indexResponse.status})`,
    );
  }
  const pages = parseIndex(await indexResponse.text());
  if (pages.length === 0) {
    throw new Error("Docs index is empty; llms.txt format may have changed");
  }

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const response = await fetch(page.markdownUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return chunkPage(page, await response.text());
    }),
  );

  const chunks = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (chunks.length === 0) {
    throw new Error("Could not load any documentation pages");
  }
  return chunks.map((chunk, id) => ({ ...chunk, id }));
}
