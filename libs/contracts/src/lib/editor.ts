import type { EditorCapability } from './packages';

/** Plain-text chars before first hyperlink allowed (anti-spam). Server clamps via env. */
export const DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS = 50;

/**
 * Machine-readable coupling between entitlement flags, TipTap (see `libs/ui`
 * job description editor), and `libs/server/jobs` ProseMirror validation.
 */
export type EntitlementTipTapDescriptor =
  | 'mark:bold'
  | 'mark:italic'
  | 'mark:underline'
  | 'mark:link'
  | 'mark:code'
  | 'node:heading'
  | 'node:list'
  | 'node:blockquote'
  | 'node:code_block'
  | 'node:image'
  | 'attr:textAlign'
  | 'integration:embed'
  | 'disabled:custom_html';

/**
 * One row per `{@link EditorCapability}` key → stable descriptor IDs.
 *
 * CMS must keep `custom_html = false`; `sanitize-html`
 * (`libs/server/jobs/job-description-html.ts`) allow-list aligns with nodes
 * implied by these descriptors.
 */
export const EntitlementToExtensionsMap = {
  bold: 'mark:bold',
  italic: 'mark:italic',
  underline: 'mark:underline',
  headings: 'node:heading',
  lists: 'node:list',
  blockquote: 'node:blockquote',
  inline_code: 'mark:code',
  code_block: 'node:code_block',
  text_align: 'attr:textAlign',
  image_upload: 'node:image',
  embed: 'integration:embed',
  hyperlinks: 'mark:link',
  custom_html: 'disabled:custom_html',
} as const satisfies Record<
  keyof EditorCapability,
  EntitlementTipTapDescriptor
>;

export type TipTapCapabilityDescriptor =
  (typeof EntitlementToExtensionsMap)[keyof typeof EntitlementToExtensionsMap];

/** Descriptors activated for this tier snapshot. */
export function buildEditorExtensions(
  caps: EditorCapability,
): EntitlementTipTapDescriptor[] {
  return (
    Object.entries(EntitlementToExtensionsMap) as [
      keyof EditorCapability,
      EntitlementTipTapDescriptor,
    ][]
  )
    .filter(([key]) => caps[key])
    .map(([, descriptor]) => descriptor);
}
