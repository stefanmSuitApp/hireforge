import imageUrlBuilder from '@sanity/image-url';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import type { ComponentProps } from 'react';

import type { CmsPortableTextBody } from '@/lib/cms-content';
import { cn } from '@/lib/utils';

function sanityImageBuilder() {
  const projectId =
    process.env['SANITY_PROJECT_ID']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']?.trim() ||
    '';
  const dataset =
    process.env['SANITY_DATASET']?.trim() ||
    process.env['NEXT_PUBLIC_SANITY_DATASET']?.trim() ||
    'production';
  if (!projectId) return null;
  return imageUrlBuilder({ projectId, dataset });
}

const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const builder = sanityImageBuilder();
      if (!builder || !value?.asset) return null;
      const url = builder
        .image(value)
        .width(1200)
        .fit('max')
        .auto('format')
        .url();
      return (
        <figure className="my-6">
          <img
            src={url}
            alt={typeof value.alt === 'string' ? value.alt : ''}
            className="max-h-[70vh] w-auto max-w-full rounded-md border border-border"
            loading="lazy"
          />
        </figure>
      );
    },
  },
  // Explicit styles: `prose` needs @tailwindcss/typography, which the app
  // does not use, so without these every block rendered as one plain run.
  block: {
    normal: ({ children }) => <p className="my-4 leading-7">{children}</p>,
    h2: ({ children }) => (
      <h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight text-foreground first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-8 text-lg font-semibold text-foreground">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 marker:text-muted-foreground">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-muted-foreground">
        {children}
      </ol>
    ),
  },
  listItem: ({ children }) => <li className="leading-7">{children}</li>,
  marks: {
    link: ({ value, children }) => {
      const href = typeof value?.href === 'string' ? value.href : undefined;
      const external = href?.startsWith('http');
      return (
        <a
          href={href}
          className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          {...(external
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {children}
        </a>
      );
    },
  },
};

export function CmsPortableText({
  value,
  className,
}: {
  value: CmsPortableTextBody | null | undefined;
  className?: string;
}) {
  const blocks = value && value.length > 0 ? value : [];
  if (!blocks.length) return null;
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none text-foreground dark:prose-invert',
        className,
      )}
    >
      <PortableText
        value={
          blocks as unknown as ComponentProps<typeof PortableText>['value']
        }
        components={portableTextComponents}
      />
    </div>
  );
}
