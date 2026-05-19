import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import type { ProseMirrorDoc } from 'contracts';
import sanitizeHtml from 'sanitize-html';

/** AVIF blobs from `job_description_media` referenced via Next `/api/public/...` proxy. */
const JOB_MEDIA_IMG_PATH =
  /^\/api\/public\/job-description-media\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Any absolute URL whose path is `/api/public/job-description-media/:uuid` is rewritten to that
 * path so the browser loads through the Next app (same-origin) instead of Nest on another host/port
 * (Docker, LAN IP, `host.docker.internal`, etc.).
 */
function normalizeJobMediaImgSrc(src: string): string {
  const s = src.trim();
  if (JOB_MEDIA_IMG_PATH.test(s)) {
    return s;
  }
  try {
    const u = new URL(s);
    const p = u.pathname.replace(/\/$/, '');
    if (JOB_MEDIA_IMG_PATH.test(p)) {
      return p;
    }
  } catch {
    /* relative or invalid */
  }
  return s;
}

/**
 * Job listing HTML pipeline: TipTap JSON → `generateHTML`, then `sanitize-html`.
 * Keep `allowedTags` / `transformTags` aligned with `contracts`
 * `EntitlementToExtensionsMap` + `buildEditorExtensions`.
 */

/**
 * Superset of employer TipTap extensions so stored JSON always renders, even if
 * the buyer’s package hid some toolbar controls when the job was authored.
 */
function jobListingTiptapExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      horizontalRule: false,
    }),
    Underline,
    Link.configure({ openOnClick: false }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ];
}

export function sanitizeJobListingHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      img: ['src', 'alt', 'class', 'title'],
      code: ['class'],
      pre: ['class'],
      p: ['style', 'class'],
      h2: ['style', 'class'],
      h3: ['style', 'class'],
      li: ['class'],
      ul: ['class'],
      ol: ['class'],
      blockquote: ['class'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$/i, /^right$/i, /^center$/i, /^justify$/i],
      },
    },
    transformTags: {
      a: (_tag, attribs) => {
        const href = String(attribs['href'] ?? '').trim();
        if (!href || !/^https?:\/\//i.test(href)) {
          return { tagName: 'span', attribs: {} as Record<string, string> };
        }
        const out: Record<string, string> = {
          href,
          rel: 'nofollow noopener noreferrer ugc',
          target: '_blank',
        };
        const cls = attribs['class'];
        if (cls) {
          out['class'] = cls;
        }
        return { tagName: 'a', attribs: out };
      },
      img: (_tag, attribs) => {
        const raw = String(attribs['src'] ?? '').trim();
        const src = normalizeJobMediaImgSrc(raw);
        let canonicalSrc: string | undefined;
        if (JOB_MEDIA_IMG_PATH.test(src)) {
          canonicalSrc = src;
        } else if (/^https?:\/\//i.test(src)) {
          canonicalSrc = src;
        }
        if (!canonicalSrc) {
          return { tagName: 'span', attribs: {} as Record<string, string> };
        }
        const out: Record<string, string> = { src: canonicalSrc };
        const alt = attribs['alt'];
        if (alt) {
          out['alt'] = alt;
        }
        const cls = attribs['class'];
        if (cls) {
          out['class'] = cls;
        }
        const title = attribs['title'];
        if (title) {
          out['title'] = title;
        }
        return { tagName: 'img', attribs: out };
      },
    },
    allowVulnerableTags: false,
  });
}

export function jobDescriptionHtmlFromDoc(
  descriptionDoc: unknown,
): string | null {
  if (!descriptionDoc || typeof descriptionDoc !== 'object') {
    return null;
  }
  const doc = descriptionDoc as JSONContent;
  if (doc.type !== 'doc') {
    return null;
  }
  try {
    const raw = generateHTML(doc, jobListingTiptapExtensions()).trim();
    if (!raw || raw === '<p></p>') {
      return null;
    }
    const safe = sanitizeJobListingHtml(raw).trim();
    return safe.length > 0 ? safe : null;
  } catch {
    return null;
  }
}

/** Persisted column value when saving a draft body. */
export function jobDescriptionHtmlFromDraftBody(input: {
  description: string;
  descriptionDoc: ProseMirrorDoc | null | undefined;
}): string | null {
  return jobDescriptionHtmlFromDoc(input.descriptionDoc);
}

/**
 * Prefer TipTap-derived HTML (runs current sanitizer). Fall back to stored `description_html`
 * when `description_doc` is missing or invalid.
 */
export function effectiveJobDescriptionHtml(
  stored: string | null | undefined,
  descriptionDoc: unknown,
): string | null {
  const fromDoc = jobDescriptionHtmlFromDoc(descriptionDoc);
  if (fromDoc) {
    return fromDoc;
  }
  const storedT = stored?.trim();
  if (!storedT) {
    return null;
  }
  return sanitizeJobListingHtml(storedT).trim() || null;
}
