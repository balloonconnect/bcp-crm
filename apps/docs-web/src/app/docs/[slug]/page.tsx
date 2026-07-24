import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOC_REGISTRY, getDocEntry } from "../../../lib/doc-registry";

export function generateStaticParams() {
  return DOC_REGISTRY.map((doc) => ({ slug: doc.slug }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const entry = getDocEntry(params.slug);
  if (!entry) notFound();

  const filePath = join(process.cwd(), "content", `${params.slug}.md`);
  if (!existsSync(filePath)) notFound();
  const content = readFileSync(filePath, "utf-8");

  return (
    <article className="prose prose-sm max-w-none sm:prose-base prose-headings:font-display prose-img:rounded-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
