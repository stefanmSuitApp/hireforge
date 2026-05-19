'use client';

import type {
  ApplyMode,
  EmployerJobDetailResponse,
  EmployerJobDraftBody,
  EntitlementsBlob,
  EmploymentType,
  ProseMirrorDoc,
  PublicJobTaxonomyDistrictGroup,
  PublicJobTaxonomyResponse,
  SeniorityLevel,
  WorkModel,
} from 'contracts';
import {
  employmentTypes,
  isValidEmployerJobPngCreativeHttpsUrl,
  plainDescriptionLength,
  seniorityLevels,
  workModels,
} from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';

import {
  Combobox,
  type ComboboxGroupSection,
  type ComboboxOption,
} from '@/components/ui/combobox';
import { Button, Checkbox, Input, Label } from '@/components/ui';
import { SelectField, type SelectFieldOption } from '@/components/ui/select';
import { pickLocalizedBilingual } from '@/features/jobs/lib/bilingual-label';
import { JobDescriptionEditorLazy } from '@/features/employer/components/job-description-editor-lazy';
import {
  useEmployerJobSubmitMutation,
  useModeratorJobDraftSaveMutation,
  useModeratorPublishDirectMutation,
  useSaveEmployerJobDraftMutation,
} from '@/hooks/mutations';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';
import type { JobDescriptionEditorToolbarLabels } from 'ui';
import { toast } from 'sonner';

/** Same sentinel as public job filters (empty city). */
const FILTER_ANY = '___hf_filter_any___';
const CATEGORY_NONE = '___hf_category_none___';

function employerJobListingSyncToken(
  jobId: string,
  job: EmployerJobDetailResponse,
): string {
  const png = typeof job.pngCreativeUrl === 'string' ? job.pngCreativeUrl : '';
  return [
    jobId,
    job.updatedAt,
    job.featured === true ? '1' : '0',
    job.crossborderVisible === true ? '1' : '0',
    png,
  ].join('\0');
}

type Props = {
  mode: 'create' | 'edit';
  jobId?: string;
  initial?: EmployerJobDetailResponse;
  taxonomy: PublicJobTaxonomyResponse;
  composerEntitlements: EntitlementsBlob;
  /** When creating, binds the draft to this subscription (required by API if multiple actives). */
  createSubscriptionId?: string;
  /** Shown under the page title in create mode. */
  listingPackageLabel?: string;
  /** All publish slots used (`submitted`+`published` ≥ max); submit for review blocked. */
  publishSlotsFull?: boolean;
  /** Staff portal: moderator save/publish APIs; hides employer Submit-for-review CTA. */
  staffPortal?: boolean;
  /** Required when `staffPortal` and `mode === 'create'`. */
  staffCompanyId?: string;
};

function buildCitySections(
  taxonomy: PublicJobTaxonomyResponse,
  locale: string,
  districtOtherLabel: string,
  cityAnyLabel: string,
): { leadingOptions: ComboboxOption[]; groups: ComboboxGroupSection[] } {
  const cityGroups: PublicJobTaxonomyDistrictGroup[] = taxonomy.cityGroups
    ?.length
    ? taxonomy.cityGroups
    : [{ district: null, cities: taxonomy.cities }];

  const leadingOptions: ComboboxOption[] = [
    {
      value: FILTER_ANY,
      label: cityAnyLabel,
      keywords: [cityAnyLabel],
    },
  ];

  const groups: ComboboxGroupSection[] = cityGroups.map((g) => {
    const districtLabel = g.district
      ? pickLocalizedBilingual(locale, g.district.nameSr, g.district.nameEn)
      : districtOtherLabel;
    const districtKeywords = (
      g.district
        ? [g.district.slug, g.district.nameSr, g.district.nameEn ?? '']
        : [districtOtherLabel]
    ).filter(Boolean);

    const options: ComboboxOption[] = g.cities.map((c) => {
      const label = pickLocalizedBilingual(locale, c.nameSr, c.nameEn);
      const cityKeywords = [c.slug, c.nameSr, c.nameEn ?? ''].filter(Boolean);
      return {
        value: c.slug,
        label,
        keywords: [...cityKeywords, ...districtKeywords],
      };
    });
    return { heading: districtLabel, options };
  });

  return { leadingOptions, groups };
}

export function JobDraftFormPage({
  mode,
  jobId,
  initial,
  taxonomy,
  composerEntitlements,
  createSubscriptionId,
  listingPackageLabel,
  publishSlotsFull = false,
  staffPortal = false,
  staffCompanyId,
}: Props) {
  const t = useTranslations('Employer.jobForm');
  const tErrors = useTranslations('Errors');
  const tWm = useTranslations('Employer.jobForm.wm');
  const tEt = useTranslations('Employer.jobForm.et');
  const tSen = useTranslations('Employer.jobForm.sen');
  const tJobs = useTranslations('Jobs');
  const tModReview = useTranslations('Moderator.review');
  const locale = useLocale();
  const router = useRouter();

  const editorLockedUpgrade = React.useMemo(
    () => ({
      dialogTitle: t('editor.lockedUpgrade.dialogTitle'),
      dialogBody: t('editor.lockedUpgrade.dialogBody'),
      closeLabel: t('editor.lockedUpgrade.close'),
      ctaLabel: t('editor.lockedUpgrade.ctaPackages'),
    }),
    [t],
  );

  const goEmployerPackages = React.useCallback(() => {
    router.push('/employer/packages');
  }, [router]);

  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [description, setDescription] = React.useState(
    initial?.description ?? '',
  );
  const [descriptionDoc, setDescriptionDoc] =
    React.useState<ProseMirrorDoc | null>(initial?.descriptionDoc ?? null);
  const [city, setCity] = React.useState(
    initial?.citySlug ? initial.citySlug : FILTER_ANY,
  );
  const [category, setCategory] = React.useState(
    initial?.categorySlug ? initial.categorySlug : CATEGORY_NONE,
  );
  const [workModel, setWorkModel] = React.useState<WorkModel>(
    (initial?.workModel as WorkModel) ?? 'hybrid',
  );
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    (initial?.employmentType as EmploymentType) ?? 'full_time',
  );
  const [seniority, setSeniority] = React.useState<SeniorityLevel>(
    (initial?.seniority as SeniorityLevel) ?? 'mid',
  );
  const [applyMode, setApplyMode] = React.useState<ApplyMode>(
    initial?.applyMode === 'external' ? 'external' : 'internal',
  );
  const [externalApplyUrl, setExternalApplyUrl] = React.useState(
    initial?.externalApplyUrl ?? '',
  );
  const [featured, setFeatured] = React.useState(initial?.featured === true);
  const [crossborderVisible, setCrossborderVisible] = React.useState(
    initial?.crossborderVisible === true,
  );
  const [pngCreativeUrl, setPngCreativeUrl] = React.useState(
    initial?.pngCreativeUrl ?? '',
  );
  const [error, setError] = React.useState<string | null>(null);
  type AutosaveUi = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';
  const [autosaveUi, setAutosaveUi] = React.useState<AutosaveUi>('idle');
  const lastPersistedRef = React.useRef('');
  const draftRef = React.useRef<EmployerJobDraftBody | null>(null);
  /**
   * Re-seed packaging fields when **server listing payload** changes (job id + revision + values).
   * A guard on `jobId` alone breaks when RSC streams a stale `initial` first: the ref was set and a
   * later payload with the real `featured` / PNG URL was ignored.
   */
  const listingServerSyncTokenRef = React.useRef<string | null>(null);

  const applyLocked = initial?.status === 'published';

  const employerSaveMut = useSaveEmployerJobDraftMutation({ mode, jobId });
  const moderatorSaveMut = useModeratorJobDraftSaveMutation({ mode, jobId });
  const saveMut = staffPortal ? moderatorSaveMut : employerSaveMut;
  const submitMut = useEmployerJobSubmitMutation();
  const publishDirectMut = useModeratorPublishDirectMutation(
    staffPortal && mode === 'edit' ? jobId : undefined,
  );
  const saveMutRef = React.useRef(saveMut);
  saveMutRef.current = saveMut;

  const categoryOptions = React.useMemo((): SelectFieldOption[] => {
    const none: SelectFieldOption = {
      value: CATEGORY_NONE,
      label: t('categoryNone'),
    };
    const rest = taxonomy.categories.map((c) => ({
      value: c.slug,
      label: pickLocalizedBilingual(locale, c.nameSr, c.nameEn),
    }));
    return [none, ...rest];
  }, [locale, t, taxonomy]);

  const cityCombobox = React.useMemo(() => {
    return buildCitySections(
      taxonomy,
      locale,
      tJobs('districtOther'),
      tJobs('cityAny'),
    );
  }, [locale, tJobs, taxonomy]);

  const editorPolicySuffix = React.useMemo(
    () =>
      `${composerEntitlements.max_characters}-${JSON.stringify(composerEntitlements.editor)}`,
    [composerEntitlements],
  );

  const editorMountKey =
    (mode === 'edit' && jobId
      ? `${jobId}-${initial?.updatedAt ?? '0'}`
      : 'create-new') + `-${editorPolicySuffix}`;

  const descriptionPlainLen = plainDescriptionLength(
    description,
    descriptionDoc,
  );

  const canFeatured = composerEntitlements.featured_listing;
  const canCrossborder = composerEntitlements.crossborder_visible;
  const canPngCreative = composerEntitlements.png_creative;
  const cityOptionalByPackage = composerEntitlements.max_cities === 'unlimited';

  const taxonomyEmpty =
    taxonomy.categories.length === 0 &&
    taxonomy.cities.length === 0 &&
    (taxonomy.cityGroups?.length ?? 0) === 0;

  const toolbarLabels =
    React.useMemo((): Partial<JobDescriptionEditorToolbarLabels> => {
      return {
        formattingToolbar: t('editor.toolbar.formattingToolbar'),
        bold: t('editor.toolbar.bold'),
        italic: t('editor.toolbar.italic'),
        underline: t('editor.toolbar.underline'),
        heading2: t('editor.toolbar.heading2'),
        heading3: t('editor.toolbar.heading3'),
        bulletList: t('editor.toolbar.bulletList'),
        orderedList: t('editor.toolbar.orderedList'),
        blockquote: t('editor.toolbar.blockquote'),
        codeBlock: t('editor.toolbar.codeBlock'),
        inlineCode: t('editor.toolbar.inlineCode'),
        link: t('editor.toolbar.link'),
        linkPrompt: t('editor.toolbar.linkPrompt'),
        alignLeft: t('editor.toolbar.alignLeft'),
        alignCenter: t('editor.toolbar.alignCenter'),
        alignRight: t('editor.toolbar.alignRight'),
        image: t('editor.toolbar.image'),
        imagePrompt: t('editor.toolbar.imagePrompt'),
        undo: t('editor.toolbar.undo'),
        redo: t('editor.toolbar.redo'),
        notInPackage: t('editor.toolbar.notInPackage'),
        characterBudget: t('editor.toolbar.characterBudget'),
      };
    }, [t]);

  const uploadInlineImage = React.useCallback(
    async (file: File): Promise<string> => {
      if (!jobId) {
        throw new Error('Missing job id');
      }
      const fd = new FormData();
      fd.append('file', file);
      const path = staffPortal
        ? `/api/moderator/jobs/${jobId}/image`
        : `/api/employer/jobs/${jobId}/image`;
      try {
        const { data } = await webHttp.post<{ url: string }>(path, fd);
        return data.url;
      } catch (err: unknown) {
        const msg = getTranslatedApiErrorMessage(
          err,
          tErrors as ErrorsTranslator,
        );
        toast.error(msg);
        throw err;
      }
    },
    [jobId, staffPortal, tErrors],
  );

  const inlineImageUploader =
    mode === 'edit' &&
    Boolean(jobId) &&
    !applyLocked &&
    composerEntitlements.editor.image_upload
      ? uploadInlineImage
      : undefined;

  React.useEffect(() => {
    if (mode !== 'edit' || !jobId || !initial) {
      return;
    }
    const token = employerJobListingSyncToken(jobId, initial);
    if (listingServerSyncTokenRef.current === token) {
      return;
    }
    listingServerSyncTokenRef.current = token;
    setFeatured(initial.featured === true);
    setCrossborderVisible(initial.crossborderVisible === true);
    setPngCreativeUrl(
      typeof initial.pngCreativeUrl === 'string' ? initial.pngCreativeUrl : '',
    );
  }, [mode, jobId, initial]);

  function buildBody(): EmployerJobDraftBody {
    const base: EmployerJobDraftBody = {
      title: title.trim(),
      description,
      descriptionDoc: descriptionDoc ?? undefined,
      citySlug: city === FILTER_ANY || !city ? undefined : city,
      categorySlug:
        category === CATEGORY_NONE || !category ? undefined : category,
      workModel,
      employmentType,
      seniority,
      applyMode,
      externalApplyUrl:
        applyMode === 'external' ? externalApplyUrl.trim() : undefined,
      primaryLanguage: initial?.primaryLanguage === 'en' ? 'en' : 'sr',
    };
    if (mode === 'edit') {
      base.featured = featured;
      base.crossborderVisible = crossborderVisible;
      const u = pngCreativeUrl.trim();
      base.pngCreativeUrl = u === '' ? null : u;
    } else {
      if (canFeatured) {
        base.featured = featured;
      }
      if (canCrossborder) {
        base.crossborderVisible = crossborderVisible;
      }
      if (canPngCreative) {
        const u = pngCreativeUrl.trim();
        base.pngCreativeUrl = u === '' ? null : u;
      }
    }
    if (
      mode === 'create' &&
      staffPortal &&
      staffCompanyId &&
      createSubscriptionId
    ) {
      return {
        ...base,
        subscriptionId: createSubscriptionId,
        companyId: staffCompanyId,
      } as EmployerJobDraftBody;
    }
    if (mode === 'create' && createSubscriptionId) {
      return { ...base, subscriptionId: createSubscriptionId };
    }
    return base;
  }

  const draftSnapshot = React.useMemo(
    () => buildBody(),
    [
      title,
      description,
      descriptionDoc,
      city,
      category,
      workModel,
      employmentType,
      seniority,
      applyMode,
      externalApplyUrl,
      featured,
      crossborderVisible,
      pngCreativeUrl,
      canFeatured,
      canCrossborder,
      canPngCreative,
      mode,
      createSubscriptionId,
      initial?.primaryLanguage,
      staffPortal,
      staffCompanyId,
    ],
  );
  draftRef.current = draftSnapshot;

  React.useEffect(() => {
    lastPersistedRef.current = '';
    setAutosaveUi('idle');
  }, [jobId]);

  React.useEffect(() => {
    if (mode !== 'edit' || !jobId || taxonomyEmpty) {
      return;
    }
    const serialized = JSON.stringify(draftSnapshot);
    if (lastPersistedRef.current === '') {
      lastPersistedRef.current = serialized;
      setAutosaveUi('idle');
      return;
    }
    if (serialized === lastPersistedRef.current) {
      setAutosaveUi((u) => (u === 'saved' ? 'saved' : 'idle'));
      return;
    }
    setAutosaveUi('unsaved');
    const tmr = window.setTimeout(() => {
      const body = draftRef.current;
      if (!body) {
        return;
      }
      if (
        typeof body.pngCreativeUrl === 'string' &&
        body.pngCreativeUrl.trim() !== '' &&
        !isValidEmployerJobPngCreativeHttpsUrl(body.pngCreativeUrl.trim())
      ) {
        setAutosaveUi('unsaved');
        return;
      }
      const s = JSON.stringify(body);
      if (s === lastPersistedRef.current) {
        setAutosaveUi('idle');
        return;
      }
      setAutosaveUi('saving');
      saveMutRef.current.mutate(body, {
        onSuccess: () => {
          lastPersistedRef.current = s;
          setAutosaveUi('saved');
          window.setTimeout(() => {
            setAutosaveUi((x) => (x === 'saved' ? 'idle' : x));
          }, 2000);
        },
        onError: () => {
          setAutosaveUi('error');
          toast.error(t('autosaveError'));
        },
      });
    }, 5000);
    return () => window.clearTimeout(tmr);
  }, [draftSnapshot, mode, jobId, taxonomyEmpty, t]);

  function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (description.length > 50_000) {
      setError(tErrors('VALIDATION_FAILED'));
      return;
    }
    if (
      canPngCreative &&
      pngCreativeUrl.trim() !== '' &&
      !isValidEmployerJobPngCreativeHttpsUrl(pngCreativeUrl.trim())
    ) {
      setError(t('pngCreativeInvalidUrl'));
      return;
    }
    const body = buildBody();
    saveMut.mutate(body, {
      onSuccess: () => {
        lastPersistedRef.current = JSON.stringify(body);
        setAutosaveUi('idle');
      },
      onError: (err) =>
        setError(
          getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
        ),
    });
  }

  const pending = saveMut.isPending;
  const submitPending = submitMut.isPending;
  const publishDirectPending = publishDirectMut.isPending;
  const blockingActionPending = submitPending || publishDirectPending;
  const canSubmit =
    !staffPortal &&
    mode === 'edit' &&
    jobId !== undefined &&
    jobId.length > 0 &&
    initial?.status === 'draft';
  const submitBlockedBySlots = canSubmit && publishSlotsFull;
  const canStaffPublish =
    staffPortal &&
    mode === 'edit' &&
    jobId !== undefined &&
    jobId.length > 0 &&
    (initial?.status === 'draft' || initial?.status === 'submitted');

  const wmOptions: SelectFieldOption[] = workModels.map((v) => ({
    value: v,
    label: tWm(v),
  }));

  const etOptions: SelectFieldOption[] = employmentTypes.map((v) => ({
    value: v,
    label: tEt(v),
  }));

  const senOptions: SelectFieldOption[] = seniorityLevels.map((v) => ({
    value: v,
    label: tSen(v),
  }));

  const descriptionOverBudget =
    descriptionPlainLen > composerEntitlements.max_characters;

  const pngCreativeUrlInlineError =
    canPngCreative &&
    !applyLocked &&
    pngCreativeUrl.trim() !== '' &&
    !isValidEmployerJobPngCreativeHttpsUrl(pngCreativeUrl.trim());

  const sectionShell =
    'rounded-xl border border-border/80 bg-card/40 p-5 shadow-sm ring-1 ring-border/30';

  const formId = 'employer-job-draft-form';

  const autosaveMessage =
    mode === 'edit' && jobId
      ? autosaveUi === 'saving'
        ? t('autosaveSaving')
        : autosaveUi === 'saved'
          ? t('autosaveSaved')
          : autosaveUi === 'error'
            ? t('autosaveError')
            : autosaveUi === 'unsaved'
              ? t('autosaveUnsaved')
              : null
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8 md:pb-28">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {mode === 'create'
            ? t('newTitle')
            : applyLocked
              ? t('editTitlePublished')
              : t('editTitle')}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {applyLocked ? t('subtitlePublished') : t('subtitle')}
        </p>
        {mode === 'create' && listingPackageLabel ? (
          <p className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-medium text-foreground">
            {t('creatingUnderPackage', { name: listingPackageLabel })}
          </p>
        ) : null}
      </header>

      {publishSlotsFull &&
      !staffPortal &&
      (mode === 'create' ||
        (mode === 'edit' && initial?.status === 'draft')) ? (
        <p
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t('publishSlotsFullBanner')}
        </p>
      ) : null}

      {applyLocked ? (
        <p
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t('liveEditBanner')}
        </p>
      ) : null}

      {taxonomyEmpty ? (
        <p className="mb-6 text-sm text-destructive" role="alert">
          {t('taxonomyMissing')}
        </p>
      ) : null}

      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-8">
        <section className={sectionShell} aria-labelledby="job-sec-basics">
          <div className="mb-4">
            <h2
              id="job-sec-basics"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t('sectionBasics')}
            </h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-title" className="text-sm font-medium">
              {t('titleLabel')}
            </Label>
            <Input
              id="job-title"
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              className="h-11 text-base"
              placeholder={t('titleLabel')}
            />
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="job-sec-desc">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2
              id="job-sec-desc"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t('sectionDescription')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('editorKeyboardHint')}
            </p>
          </div>
          <div className="space-y-3">
            <JobDescriptionEditorLazy
              mountKey={editorMountKey}
              initialPlain={initial?.description ?? ''}
              initialDoc={initial?.descriptionDoc ?? null}
              editable={!blockingActionPending && !applyLocked}
              editorCapabilities={composerEntitlements.editor}
              toolbarLabels={toolbarLabels}
              placeholder={t('editor.placeholder')}
              maxCharacters={composerEntitlements.max_characters}
              charCount={descriptionPlainLen}
              lockedUpgradePrompt={editorLockedUpgrade}
              onNavigatePackages={goEmployerPackages}
              uploadInlineImage={inlineImageUploader}
              onChange={({ plainText, doc }) => {
                setDescription(plainText);
                setDescriptionDoc(doc);
              }}
            />
            {descriptionOverBudget ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {t('descriptionCharBudget', {
                  used: descriptionPlainLen,
                  max: composerEntitlements.max_characters,
                })}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('descriptionHint')}
              </p>
            )}
          </div>
        </section>

        <section
          className={sectionShell}
          aria-labelledby="job-packaging-heading"
        >
          <div className="mb-4">
            <h2
              id="job-packaging-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t('sectionPackaging')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('packagingSectionHint')}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Checkbox
                id="job-featured"
                checked={featured}
                disabled={blockingActionPending || applyLocked || !canFeatured}
                onCheckedChange={(v) => setFeatured(v === true)}
                aria-label={t('featuredLabel')}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor="job-featured"
                  className={!canFeatured ? 'text-muted-foreground' : undefined}
                >
                  {t('featuredLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('featuredHint')}
                  {!canFeatured ? ` ${t('lockedFeatureHint')}` : ''}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox
                id="job-crossborder"
                checked={crossborderVisible}
                disabled={
                  blockingActionPending || applyLocked || !canCrossborder
                }
                onCheckedChange={(v) => setCrossborderVisible(v === true)}
                aria-label={t('crossborderLabel')}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor="job-crossborder"
                  className={
                    !canCrossborder ? 'text-muted-foreground' : undefined
                  }
                >
                  {t('crossborderLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('crossborderHint')}
                  {!canCrossborder ? ` ${t('lockedFeatureHint')}` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="job-png-creative"
                className={
                  !canPngCreative ? 'text-muted-foreground' : undefined
                }
              >
                {t('pngCreativeLabel')}
              </Label>
              <Input
                id="job-png-creative"
                name="pngCreativeUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://…"
                maxLength={2048}
                value={pngCreativeUrl}
                onChange={(e) => setPngCreativeUrl(e.target.value)}
                readOnly={applyLocked}
                disabled={
                  blockingActionPending || applyLocked || !canPngCreative
                }
                className="h-10"
                aria-invalid={pngCreativeUrlInlineError}
              />
              {pngCreativeUrlInlineError ? (
                <p
                  className="text-sm font-medium text-destructive"
                  role="alert"
                >
                  {t('pngCreativeInvalidUrl')}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t('pngCreativeHint')}
                {!canPngCreative ? ` ${t('lockedFeatureHint')}` : ''}
              </p>
            </div>
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="job-sec-role">
          <h2
            id="job-sec-role"
            className="mb-4 text-base font-semibold tracking-tight text-foreground"
          >
            {t('sectionRole')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-city">{t('cityLabel')}</Label>
              <Combobox
                id="job-city"
                leadingOptions={cityCombobox.leadingOptions}
                groups={cityCombobox.groups}
                value={city === '' ? FILTER_ANY : city}
                onValueChange={(v) =>
                  setCity(v === FILTER_ANY ? FILTER_ANY : v)
                }
                placeholder={tJobs('cityAny')}
                searchPlaceholder={tJobs('citySearchPlaceholder')}
                emptyText={tJobs('cityEmpty')}
              />
              {cityOptionalByPackage ? (
                <p className="text-xs text-muted-foreground">
                  {t('cityOptionalByPackageHint')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-category">{t('categoryLabel')}</Label>
              <SelectField
                id="job-category"
                options={categoryOptions}
                value={category}
                onValueChange={setCategory}
                placeholder={t('categoryNone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-wm">{t('workModelLabel')}</Label>
              <SelectField
                id="job-wm"
                options={wmOptions}
                value={workModel}
                onValueChange={(v) => setWorkModel(v as WorkModel)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-et">{t('employmentTypeLabel')}</Label>
              <SelectField
                id="job-et"
                options={etOptions}
                value={employmentType}
                onValueChange={(v) => setEmploymentType(v as EmploymentType)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-sen">{t('seniorityLabel')}</Label>
              <SelectField
                id="job-sen"
                options={senOptions}
                value={seniority}
                onValueChange={(v) => setSeniority(v as SeniorityLevel)}
              />
            </div>
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="job-sec-apply">
          <h2
            id="job-sec-apply"
            className="mb-4 text-base font-semibold tracking-tight text-foreground"
          >
            {t('sectionApply')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-apply-mode">{t('applyModeLabel')}</Label>
              <SelectField
                id="job-apply-mode"
                options={[
                  { value: 'internal', label: t('applyModeInternal') },
                  { value: 'external', label: t('applyModeExternal') },
                ]}
                value={applyMode}
                onValueChange={(v) => setApplyMode(v as ApplyMode)}
                disabled={applyLocked}
              />
              {applyLocked ? (
                <p className="text-xs text-muted-foreground">
                  {t('applyLockedHint')}
                </p>
              ) : null}
            </div>

            {applyMode === 'external' ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="job-ext-url">{t('externalUrlLabel')}</Label>
                <Input
                  id="job-ext-url"
                  name="externalApplyUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://…"
                  required
                  maxLength={2048}
                  value={externalApplyUrl}
                  onChange={(e) => setExternalApplyUrl(e.target.value)}
                  readOnly={applyLocked}
                  disabled={applyLocked}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  {t('externalUrlHint')}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="min-h-[1.25rem] text-xs text-muted-foreground"
            aria-live="polite"
          >
            {autosaveMessage ? (
              <span
                className={
                  autosaveUi === 'error'
                    ? 'font-medium text-destructive'
                    : autosaveUi === 'saved'
                      ? 'font-medium text-primary'
                      : ''
                }
              >
                {autosaveMessage}
              </span>
            ) : (
              <span className="text-muted-foreground/70">
                {mode === 'edit' && jobId
                  ? descriptionOverBudget
                    ? t('descriptionCharBudget', {
                        used: descriptionPlainLen,
                        max: composerEntitlements.max_characters,
                      })
                    : '\u00a0'
                  : '\u00a0'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form={formId}
              disabled={
                pending ||
                blockingActionPending ||
                taxonomyEmpty ||
                descriptionOverBudget
              }
              className="min-w-[8rem]"
            >
              {pending
                ? t('saving')
                : applyLocked
                  ? t('saveLiveResubmit')
                  : t('saveDraft')}
            </Button>
            {canSubmit && jobId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={
                  pending ||
                  blockingActionPending ||
                  submitBlockedBySlots ||
                  descriptionOverBudget
                }
                title={
                  submitBlockedBySlots
                    ? t('submitDisabledSlotsFullHint')
                    : undefined
                }
                onClick={() => {
                  setError(null);
                  submitMut.mutate(jobId, {
                    onError: (err) =>
                      setError(
                        getTranslatedApiErrorMessage(
                          err,
                          tErrors as ErrorsTranslator,
                        ),
                      ),
                  });
                }}
              >
                {submitPending ? t('submitting') : t('submitForReview')}
              </Button>
            ) : null}
            {canStaffPublish && jobId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={
                  pending || blockingActionPending || descriptionOverBudget
                }
                onClick={() => {
                  setError(null);
                  publishDirectMut.mutate(undefined, {
                    onError: (err) =>
                      setError(
                        getTranslatedApiErrorMessage(
                          err,
                          tErrors as ErrorsTranslator,
                        ),
                      ),
                  });
                }}
              >
                {publishDirectPending
                  ? tModReview('publishingDirect')
                  : tModReview('publishDirect')}
              </Button>
            ) : null}
          </div>
        </div>
        {submitBlockedBySlots ? (
          <p className="pointer-events-auto mx-auto max-w-3xl px-4 pb-3 text-xs text-muted-foreground sm:text-center">
            {t('submitDisabledSlotsFullHint')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
