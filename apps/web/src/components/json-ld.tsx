import { serializeJsonLd } from '@/lib/seo/json-ld';

/** Renders schema.org JSON-LD; `null` entries are skipped. */
export function JsonLd({ data }: { data: Array<object | null> }) {
  return (
    <>
      {data.filter(Boolean).map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Escaped by serializeJsonLd: no markup can break out of the tag.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(d) }}
        />
      ))}
    </>
  );
}
