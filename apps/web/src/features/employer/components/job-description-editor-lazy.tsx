'use client';

import dynamic from 'next/dynamic';
import type { EditorCapability, ProseMirrorDoc } from 'contracts';
import type {
  JobDescriptionEditorToolbarLabels,
  JobDescriptionLockedUpgradePrompt,
} from 'ui';
import * as React from 'react';

const JobDescriptionEditor = dynamic(
  () =>
    import('ui').then((m) => ({
      default: m.JobDescriptionEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="overflow-hidden rounded-lg border border-input bg-muted/20 shadow-sm">
        <div className="h-11 border-b border-border bg-muted/40" />
        <div className="min-h-[min(40vh,280px)] w-full animate-pulse bg-muted/30" />
        <div className="h-14 border-t border-border bg-muted/25" />
      </div>
    ),
  },
);

export type JobDescriptionEditorLazyProps = {
  mountKey: string;
  initialPlain: string;
  initialDoc: ProseMirrorDoc | null | undefined;
  editable?: boolean;
  editorCapabilities: EditorCapability;
  onChange: (payload: {
    plainText: string;
    doc: ProseMirrorDoc | null;
  }) => void;
  toolbarLabels?: Partial<JobDescriptionEditorToolbarLabels>;
  placeholder?: string;
  maxCharacters?: number;
  charCount?: number;
  lockedUpgradePrompt?: JobDescriptionLockedUpgradePrompt | null;
  onNavigatePackages?: () => void;
  uploadInlineImage?: (file: File) => Promise<string>;
};

export function JobDescriptionEditorLazy({
  mountKey,
  initialPlain,
  initialDoc,
  editable = true,
  editorCapabilities,
  onChange,
  toolbarLabels,
  placeholder,
  maxCharacters,
  charCount,
  lockedUpgradePrompt,
  onNavigatePackages,
  uploadInlineImage,
}: JobDescriptionEditorLazyProps) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const stableOnChange = React.useCallback(
    (payload: { plainText: string; doc: ProseMirrorDoc | null }) => {
      onChangeRef.current(payload);
    },
    [],
  );

  return (
    <JobDescriptionEditor
      mountKey={mountKey}
      initialPlain={initialPlain}
      initialDoc={initialDoc}
      editable={editable}
      editorCapabilities={editorCapabilities}
      onChange={stableOnChange}
      toolbarLabels={toolbarLabels}
      placeholder={placeholder}
      maxCharacters={maxCharacters}
      charCount={charCount}
      lockedUpgradePrompt={lockedUpgradePrompt ?? undefined}
      onNavigatePackages={onNavigatePackages}
      uploadInlineImage={uploadInlineImage}
    />
  );
}
