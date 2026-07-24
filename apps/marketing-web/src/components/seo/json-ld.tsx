/** Renders a schema.org object as a `<script type="application/ld+json">` tag. Server component — no serialization concerns with client boundaries. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    // eslint-disable-next-line react/no-danger -- JSON-LD must be inlined as a script tag; `data` always comes from our own typed builder functions in lib/seo.ts, never from user input.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
