import type {
  EditorCapability,
  EntitlementsBlob,
  ProseMirrorDoc,
} from 'contracts';
import {
  DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS,
  plainDescriptionLength,
} from 'contracts';

export type JobDraftEntitlementOptions = {
  /**
   * Block listed hostnames (and their subdomains) in description links.
   * Example entry: `bit.ly` matches `bit.ly` and `x.bit.ly`.
   */
  linkHostBlocklist: string[];
  /**
   * Reject hyperlinks whose first character falls before this plain offset in doc order (`0` = disabled).
   */
  linkMinLeadPlainChars: number;
};

export type JobEntitlementsViolation =
  | { code: 'JOB_ENTITLEMENTS_DESCRIPTION_LENGTH'; max: number; actual: number }
  | { code: 'JOB_ENTITLEMENTS_CITY_REQUIRED' }
  | { code: 'JOB_ENTITLEMENTS_HYPERLINK_FORBIDDEN' }
  | { code: 'JOB_ENTITLEMENTS_HYPERLINK_COUNT'; max: number; actual: number }
  | { code: 'JOB_ENTITLEMENTS_HYPERLINK_HTTPS'; href: string }
  | {
      code: 'JOB_ENTITLEMENTS_HYPERLINK_TOO_EARLY';
      minLeadChars: number;
      atPlainOffset: number;
    }
  | { code: 'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED'; hostname: string }
  | { code: 'JOB_ENTITLEMENTS_EDITOR'; detail: string }
  | { code: 'JOB_ENTITLEMENTS_FEATURED_FORBIDDEN' }
  | { code: 'JOB_ENTITLEMENTS_CROSSBORDER_FORBIDDEN' }
  | { code: 'JOB_ENTITLEMENTS_PNG_CREATIVE_FORBIDDEN' };

function isPmNode(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function collectLinks(node: unknown, out: string[]): void {
  if (!isPmNode(node)) {
    return;
  }
  const marks = node['marks'];
  if (Array.isArray(marks)) {
    for (const m of marks) {
      if (!isPmNode(m)) {
        continue;
      }
      if (m['type'] === 'link') {
        const attrs = m['attrs'];
        const href =
          isPmNode(attrs) && typeof attrs['href'] === 'string'
            ? attrs['href']
            : '';
        if (href) {
          out.push(href);
        }
      }
    }
  }
  const content = node['content'];
  if (Array.isArray(content)) {
    for (const c of content) {
      collectLinks(c, out);
    }
  }
}

function hostBlocked(hostname: string, blocklist: string[]): boolean {
  const h = hostname.trim().toLowerCase();
  for (const raw of blocklist) {
    const pat = raw.trim().toLowerCase();
    if (!pat) {
      continue;
    }
    if (h === pat || h.endsWith(`.${pat}`)) {
      return true;
    }
  }
  return false;
}

function firstHyperlinkPlainStart(doc: ProseMirrorDoc): number | null {
  if (doc.type !== 'doc') {
    return null;
  }
  let offset = 0;
  let found: number | null = null;
  function walk(n: unknown): void {
    if (!isPmNode(n)) {
      return;
    }
    if (n['type'] === 'text') {
      const txt = typeof n['text'] === 'string' ? n['text'] : '';
      const marks = n['marks'];
      const linked =
        Array.isArray(marks) &&
        marks.some((m) => isPmNode(m) && m['type'] === 'link');
      if (linked && txt.length > 0 && found === null) {
        found = offset;
      }
      offset += txt.length;
      return;
    }
    const ch = n['content'];
    if (!Array.isArray(ch)) {
      return;
    }
    for (const child of ch) {
      walk(child);
    }
  }
  const root = (doc as unknown as Record<string, unknown>)['content'];
  if (Array.isArray(root)) {
    for (const node of root) {
      walk(node);
    }
  }
  return found;
}

function checkEditorStructure(
  node: unknown,
  caps: EditorCapability,
  path: string,
  violations: JobEntitlementsViolation[],
): void {
  if (!isPmNode(node)) {
    return;
  }
  const type = node['type'];
  if (type === 'heading' && !caps.headings) {
    violations.push({
      code: 'JOB_ENTITLEMENTS_EDITOR',
      detail: `${path}:headings`,
    });
  }
  if ((type === 'bulletList' || type === 'orderedList') && !caps.lists) {
    violations.push({
      code: 'JOB_ENTITLEMENTS_EDITOR',
      detail: `${path}:lists`,
    });
  }
  if (type === 'blockquote' && !caps.blockquote) {
    violations.push({
      code: 'JOB_ENTITLEMENTS_EDITOR',
      detail: `${path}:blockquote`,
    });
  }
  if (type === 'codeBlock' && !caps.code_block) {
    violations.push({
      code: 'JOB_ENTITLEMENTS_EDITOR',
      detail: `${path}:code_block`,
    });
  }
  if (type === 'image' && !caps.image_upload) {
    violations.push({
      code: 'JOB_ENTITLEMENTS_EDITOR',
      detail: `${path}:image_upload`,
    });
  }

  const attrs = node['attrs'];
  if (isPmNode(attrs)) {
    const ta = attrs['textAlign'];
    if (
      typeof ta === 'string' &&
      ta !== '' &&
      ta !== 'left' &&
      !caps.text_align
    ) {
      violations.push({
        code: 'JOB_ENTITLEMENTS_EDITOR',
        detail: `${path}:text_align`,
      });
    }
  }

  const marks = node['marks'];
  if (Array.isArray(marks)) {
    for (const m of marks) {
      if (!isPmNode(m)) {
        continue;
      }
      const mt = m['type'];
      if (mt === 'bold' && !caps.bold) {
        violations.push({
          code: 'JOB_ENTITLEMENTS_EDITOR',
          detail: `${path}:bold`,
        });
      }
      if (mt === 'italic' && !caps.italic) {
        violations.push({
          code: 'JOB_ENTITLEMENTS_EDITOR',
          detail: `${path}:italic`,
        });
      }
      if (mt === 'underline' && !caps.underline) {
        violations.push({
          code: 'JOB_ENTITLEMENTS_EDITOR',
          detail: `${path}:underline`,
        });
      }
      if (mt === 'link' && !caps.hyperlinks) {
        violations.push({
          code: 'JOB_ENTITLEMENTS_EDITOR',
          detail: `${path}:hyperlinks`,
        });
      }
      if (mt === 'code' && !caps.inline_code) {
        violations.push({
          code: 'JOB_ENTITLEMENTS_EDITOR',
          detail: `${path}:inline_code`,
        });
      }
    }
  }

  const content = node['content'];
  if (Array.isArray(content)) {
    content.forEach((c, i) =>
      checkEditorStructure(c, caps, `${path}.${i}`, violations),
    );
  }
}

/**
 * Validate draft payload against a subscription entitlements snapshot (SSOT §6.3).
 */
export function validateJobDraftAgainstEntitlements(
  entitlements: EntitlementsBlob,
  input: {
    description: string;
    descriptionDoc: ProseMirrorDoc | null | undefined;
    citySlug: string | undefined;
    featured?: boolean;
    crossborderVisible?: boolean;
    pngCreativeUrl?: string | null;
  },
  options?: Partial<JobDraftEntitlementOptions>,
): { ok: true } | { ok: false; violation: JobEntitlementsViolation } {
  const linkOpts: JobDraftEntitlementOptions = {
    linkHostBlocklist: options?.linkHostBlocklist ?? [],
    linkMinLeadPlainChars:
      options?.linkMinLeadPlainChars !== undefined
        ? Math.max(0, options.linkMinLeadPlainChars)
        : DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS,
  };
  const len = plainDescriptionLength(
    input.description,
    input.descriptionDoc ?? null,
  );
  if (len > entitlements.max_characters) {
    return {
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_DESCRIPTION_LENGTH',
        max: entitlements.max_characters,
        actual: len,
      },
    };
  }

  if (input.featured === true && !entitlements.featured_listing) {
    return {
      ok: false,
      violation: { code: 'JOB_ENTITLEMENTS_FEATURED_FORBIDDEN' },
    };
  }
  if (input.crossborderVisible === true && !entitlements.crossborder_visible) {
    return {
      ok: false,
      violation: { code: 'JOB_ENTITLEMENTS_CROSSBORDER_FORBIDDEN' },
    };
  }
  const png =
    typeof input.pngCreativeUrl === 'string' ? input.pngCreativeUrl.trim() : '';
  if (png.length > 0 && !entitlements.png_creative) {
    return {
      ok: false,
      violation: { code: 'JOB_ENTITLEMENTS_PNG_CREATIVE_FORBIDDEN' },
    };
  }

  const maxCities = entitlements.max_cities;
  if (maxCities !== 'unlimited') {
    const city = input.citySlug?.trim();
    if (!city) {
      return {
        ok: false,
        violation: { code: 'JOB_ENTITLEMENTS_CITY_REQUIRED' },
      };
    }
  }

  const doc = input.descriptionDoc ?? null;
  const links: string[] = [];
  if (doc && doc.type === 'doc') {
    collectLinks(doc, links);
  }

  if (!entitlements.editor.hyperlinks && links.length > 0) {
    return {
      ok: false,
      violation: { code: 'JOB_ENTITLEMENTS_HYPERLINK_FORBIDDEN' },
    };
  }

  const maxLinks = entitlements.hyperlinks_max_count;
  if (links.length > maxLinks) {
    return {
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_COUNT',
        max: maxLinks,
        actual: links.length,
      },
    };
  }

  for (const href of links) {
    const u = href.trim();
    if (!u.startsWith('https://')) {
      return {
        ok: false,
        violation: { code: 'JOB_ENTITLEMENTS_HYPERLINK_HTTPS', href: u },
      };
    }
  }

  if (linkOpts.linkHostBlocklist.length > 0) {
    for (const href of links) {
      try {
        const host = new URL(href.trim()).hostname;
        if (hostBlocked(host, linkOpts.linkHostBlocklist)) {
          return {
            ok: false,
            violation: {
              code: 'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED',
              hostname: host,
            },
          };
        }
      } catch {
        return {
          ok: false,
          violation: {
            code: 'JOB_ENTITLEMENTS_HYPERLINK_HTTPS',
            href: href.trim(),
          },
        };
      }
    }
  }

  if (
    entitlements.editor.hyperlinks &&
    linkOpts.linkMinLeadPlainChars > 0 &&
    doc &&
    doc.type === 'doc' &&
    links.length > 0
  ) {
    const pos = firstHyperlinkPlainStart(doc);
    if (pos !== null && pos < linkOpts.linkMinLeadPlainChars) {
      return {
        ok: false,
        violation: {
          code: 'JOB_ENTITLEMENTS_HYPERLINK_TOO_EARLY',
          minLeadChars: linkOpts.linkMinLeadPlainChars,
          atPlainOffset: pos,
        },
      };
    }
  }

  if (doc && doc.type === 'doc') {
    const structureViolations: JobEntitlementsViolation[] = [];
    const content = (doc as Record<string, unknown>)['content'];
    if (Array.isArray(content)) {
      content.forEach((c, i) =>
        checkEditorStructure(
          c,
          entitlements.editor,
          `${i}`,
          structureViolations,
        ),
      );
    }
    if (structureViolations.length > 0) {
      return { ok: false, violation: structureViolations[0] };
    }
  }

  return { ok: true };
}
