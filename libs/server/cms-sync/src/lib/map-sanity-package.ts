import {
  cmsPackageMirrorPayloadSchema,
  type CmsPackageMirrorPayload,
  type CmsPackageUpgradeMessageRow,
} from 'contracts';

function asRecord(o: unknown): Record<string, unknown> {
  if (!o || typeof o !== 'object') {
    throw new Error('invalid_sanity_package: expected object');
  }
  return o as Record<string, unknown>;
}

function num(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`invalid_sanity_package: ${field} must be a number`);
  }
  return v;
}

function bool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') {
    throw new Error(`invalid_sanity_package: ${field} must be a boolean`);
  }
  return v;
}

function strOpt(v: unknown, field: string, max: number): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v !== 'string') {
    throw new Error(`invalid_sanity_package: ${field} must be a string`);
  }
  const t = v.trim();
  if (!t.length) {
    return null;
  }
  if (t.length > max) {
    throw new Error(`invalid_sanity_package: ${field} exceeds ${max} chars`);
  }
  return t;
}

/**
 * Map a published `packageDefinition` Sanity document (camelCase fields) into
 * {@link CmsPackageMirrorPayload}. Throws with a readable message on bad data.
 */
export function mapSanityPackageDefinitionDoc(
  rawUnknown: unknown,
): CmsPackageMirrorPayload {
  const raw = asRecord(rawUnknown);
  const cmsRef = typeof raw['_id'] === 'string' ? raw['_id'].trim() : '';
  if (!cmsRef) {
    throw new Error('invalid_sanity_package: missing _id');
  }
  if (raw['_type'] !== 'packageDefinition') {
    throw new Error(
      `invalid_sanity_package: expected _type packageDefinition, got ${String(raw['_type'])}`,
    );
  }

  const codeRaw = raw['code'];
  if (typeof codeRaw !== 'string' || !codeRaw.trim()) {
    throw new Error('invalid_sanity_package: code required');
  }

  const pricesIn = raw['prices'];
  if (!Array.isArray(pricesIn)) {
    throw new Error('invalid_sanity_package: prices must be an array');
  }
  const prices = pricesIn.map((p, i) => {
    const row = asRecord(p);
    return {
      durationDays: num(row['durationDays'], `prices[${i}].durationDays`),
      amountMinor: num(row['amountMinor'], `prices[${i}].amountMinor`),
      currency: (() => {
        const c = row['currency'];
        if (typeof c !== 'string' || c.length !== 3) {
          throw new Error(`invalid_sanity_package: prices[${i}].currency`);
        }
        return c.toUpperCase();
      })(),
    };
  });

  if (raw['entitlements'] === undefined || raw['entitlements'] === null) {
    throw new Error('invalid_sanity_package: entitlements required');
  }
  const ent = asRecord(raw['entitlements']);
  const ed = asRecord(ent['editor']);
  const editor = {
    bold: bool(ed['bold'], 'entitlements.editor.bold'),
    italic: bool(ed['italic'], 'entitlements.editor.italic'),
    underline: bool(ed['underline'], 'entitlements.editor.underline'),
    headings: bool(ed['headings'], 'entitlements.editor.headings'),
    lists: bool(ed['lists'], 'entitlements.editor.lists'),
    blockquote: bool(ed['blockquote'], 'entitlements.editor.blockquote'),
    inline_code: bool(ed['inline_code'], 'entitlements.editor.inline_code'),
    code_block: bool(ed['code_block'], 'entitlements.editor.code_block'),
    text_align: bool(ed['text_align'], 'entitlements.editor.text_align'),
    image_upload: bool(ed['image_upload'], 'entitlements.editor.image_upload'),
    embed: bool(ed['embed'], 'entitlements.editor.embed'),
    hyperlinks: bool(ed['hyperlinks'], 'entitlements.editor.hyperlinks'),
    custom_html: false as const,
  };

  const maxCitiesUnlimited = bool(
    ent['maxCitiesUnlimited'],
    'entitlements.maxCitiesUnlimited',
  );
  const max_cities = maxCitiesUnlimited
    ? ('unlimited' as const)
    : num(ent['maxCitiesCount'], 'entitlements.maxCitiesCount');

  const entitlements = {
    max_active_jobs: num(ent['maxActiveJobs'], 'entitlements.maxActiveJobs'),
    max_cities,
    max_characters: num(ent['maxCharacters'], 'entitlements.maxCharacters'),
    featured_listing: bool(
      ent['featuredListing'],
      'entitlements.featuredListing',
    ),
    png_creative: bool(ent['pngCreative'], 'entitlements.pngCreative'),
    social_publish: bool(ent['socialPublish'], 'entitlements.socialPublish'),
    paid_social_ads: bool(ent['paidSocialAds'], 'entitlements.paidSocialAds'),
    crossborder_visible: bool(
      ent['crossborderVisible'],
      'entitlements.crossborderVisible',
    ),
    hyperlinks_max_count: num(
      ent['hyperlinksMaxCount'],
      'entitlements.hyperlinksMaxCount',
    ),
    editor,
  };

  const displayOrderRaw = raw['displayOrder'];

  let upgradeMessages: CmsPackageUpgradeMessageRow[] | undefined;
  const umRaw = raw['upgradeMessages'];
  if (umRaw !== undefined && umRaw !== null) {
    if (!Array.isArray(umRaw)) {
      throw new Error(
        'invalid_sanity_package: upgradeMessages must be an array',
      );
    }
    upgradeMessages = umRaw.map((row, i) => {
      const o = asRecord(row);
      const fk = o['featureKey'];
      if (typeof fk !== 'string' || !fk.trim()) {
        throw new Error(
          `invalid_sanity_package: upgradeMessages[${i}].featureKey required`,
        );
      }
      const messageSr = strOpt(
        o['messageSr'],
        `upgradeMessages[${i}].messageSr`,
        2000,
      );
      const messageEn = strOpt(
        o['messageEn'],
        `upgradeMessages[${i}].messageEn`,
        2000,
      );
      const out: CmsPackageUpgradeMessageRow = { featureKey: fk.trim() };
      if (messageSr) {
        out.messageSr = messageSr;
      }
      if (messageEn) {
        out.messageEn = messageEn;
      }
      return out;
    });
  }

  return cmsPackageMirrorPayloadSchema.parse({
    cmsRef,
    code: codeRaw.trim(),
    isActive: bool(raw['isActive'], 'isActive'),
    isEnterprise: bool(raw['isEnterprise'], 'isEnterprise'),
    displayOrder:
      displayOrderRaw === null || displayOrderRaw === undefined
        ? null
        : num(displayOrderRaw, 'displayOrder'),
    prices,
    entitlements,
    titleSr: strOpt(raw['titleSr'], 'titleSr', 200),
    titleEn: strOpt(raw['titleEn'], 'titleEn', 200),
    marketingDescriptionSr: strOpt(
      raw['marketingDescriptionSr'],
      'marketingDescriptionSr',
      4000,
    ),
    marketingDescriptionEn: strOpt(
      raw['marketingDescriptionEn'],
      'marketingDescriptionEn',
      4000,
    ),
    upgradeMessages,
  });
}
