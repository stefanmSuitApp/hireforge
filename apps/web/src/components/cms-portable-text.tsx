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
