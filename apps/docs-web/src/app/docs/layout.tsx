import Link from "next/link";
import { groupDocsByCategory } from "../../lib/doc-registry";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const grouped = groupDocsByCategory();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-border p-4 md:block">
        <Link href="/" className="mb-4 block font-display text-lg">BCP Studio OS Docs</Link>
        {Object.entries(grouped).map(([category, docs]) => (
          <div key={category} className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{category}</p>
            <ul className="flex flex-col gap-0.5">
              {docs.map((doc) => (
                <li key={doc.slug}>
                  <Link href={`/docs/${doc.slug}`} className="block rounded-md px-2 py-1 text-sm hover:bg-accent">
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
