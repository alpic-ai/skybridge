import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
  getReleases,
  linkifyReferences,
  slugifyTag,
  splitChanges,
} from "../../lib";

export const dynamic = "force-static";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

function withExternalLinks(html: string): string {
  return html.replace(
    /<a\s+href=/g,
    '<a target="_blank" rel="noreferrer" href=',
  );
}

export async function generateStaticParams() {
  const releases = await getReleases();
  return releases.map((release) => ({ slug: slugifyTag(release.tag_name) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const releases = await getReleases();
  const release = releases.find((r) => slugifyTag(r.tag_name) === slug);
  if (!release || !release.body) {
    return new Response("", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const { changes } = splitChanges(linkifyReferences(release.body));
  if (!changes) {
    return new Response("", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const file = await processor.process(changes);
  return new Response(withExternalLinks(String(file)), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
