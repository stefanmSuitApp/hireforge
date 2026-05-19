import type { ProseMirrorDoc } from './employer-jobs';

function isPmNode(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function extractTextLenFromDocNode(node: unknown): number {
  if (!isPmNode(node)) {
    return 0;
  }
  let n = 0;
  if (node['type'] === 'text' && typeof node['text'] === 'string') {
    n += node['text'].length;
  }
  const content = node['content'];
  if (Array.isArray(content)) {
    for (const c of content) {
      n += extractTextLenFromDocNode(c);
    }
  }
  return n;
}

/** Plain length for caps: prefer synced `description`, else TipTap text nodes. */
export function plainDescriptionLength(
  description: string,
  descriptionDoc: ProseMirrorDoc | null | undefined,
): number {
  const fromPlain = description.trim().length;
  if (fromPlain > 0) {
    return description.length;
  }
  if (descriptionDoc && descriptionDoc.type === 'doc') {
    return extractTextLenFromDocNode(descriptionDoc);
  }
  return 0;
}
