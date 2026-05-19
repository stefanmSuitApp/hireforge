'use client';

import type { EditorCapability, ProseMirrorDoc } from 'contracts';
import type { Extensions, JSONContent, Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from './cn';

export type JobDescriptionEditorToolbarLabels = {
  formattingToolbar: string;
  bold: string;
  italic: string;
  underline: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  codeBlock: string;
  inlineCode: string;
  link: string;
  linkPrompt: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  image: string;
  imagePrompt: string;
  undo: string;
  redo: string;
  /** Appended to tool label when a control is disabled by package */
  notInPackage: string;
  characterBudget: string;
};

const DEFAULT_TOOLBAR: JobDescriptionEditorToolbarLabels = {
  formattingToolbar: 'Rich text formatting',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bullet list',
  orderedList: 'Numbered list',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  inlineCode: 'Inline code',
  link: 'Link',
  linkPrompt: 'Link URL (https://)',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  image: 'Image',
  imagePrompt: 'Image URL (https://)',
  undo: 'Undo',
  redo: 'Redo',
  notInPackage: 'Not included in your package',
  characterBudget: 'Character budget',
};

export type JobDescriptionLockedUpgradePrompt = {
  dialogTitle: string;
  dialogBody: string;
  closeLabel: string;
  ctaLabel: string;
};

export type JobDescriptionEditorProps = {
  mountKey: string;
  initialPlain: string;
  initialDoc: ProseMirrorDoc | null | undefined;
  editable?: boolean;
  className?: string;
  editorClassName?: string;
  editorCapabilities: EditorCapability;
  onChange: (payload: {
    plainText: string;
    doc: ProseMirrorDoc | null;
  }) => void;
  /** Accessible labels for the toolbar; partial overrides merge onto English defaults. */
  toolbarLabels?: Partial<JobDescriptionEditorToolbarLabels>;
  /** Empty editor hint (TipTap placeholder). */
  placeholder?: string;
  /** When set with charCount, shows a budget meter under the editor. */
  maxCharacters?: number;
  charCount?: number;
  /** Unlock / upgrade copy when the user taps a package-locked control. */
  lockedUpgradePrompt?: JobDescriptionLockedUpgradePrompt | null;
  /** Open employer packages (or similar) after the user chooses the CTA in the dialog. */
  onNavigatePackages?: () => void;
  /**
   * When set (e.g. draft job with `image_upload` entitlement), inserts AVIF blobs via multipart upload
   * instead of a raw URL prompt.
   */
  uploadInlineImage?: (file: File) => Promise<string>;
};

function docFromInitial(
  initialDoc: ProseMirrorDoc | null | undefined,
  initialPlain: string,
): JSONContent {
  if (
    initialDoc &&
    typeof initialDoc === 'object' &&
    initialDoc.type === 'doc'
  ) {
    return initialDoc as JSONContent;
  }
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: initialPlain ? [{ type: 'text', text: initialPlain }] : [],
      },
    ],
  };
}

function buildExtensions(
  caps: EditorCapability,
  placeholderText: string | undefined,
): Extensions {
  const ph =
    placeholderText && placeholderText.trim().length > 0
      ? placeholderText.trim()
      : undefined;

  return [
    StarterKit.configure({
      heading: caps.headings ? { levels: [2, 3] } : false,
      bulletList: caps.lists ? {} : false,
      orderedList: caps.lists ? {} : false,
      blockquote: caps.blockquote ? {} : false,
      codeBlock: caps.code_block ? {} : false,
      code: caps.inline_code ? {} : false,
      bold: caps.bold ? {} : false,
      italic: caps.italic ? {} : false,
      horizontalRule: false,
    }),
    ...(ph
      ? [
          Placeholder.configure({
            placeholder: ph,
            showOnlyWhenEditable: true,
            showOnlyCurrent: false,
          }),
        ]
      : []),
    ...(caps.underline ? [Underline] : []),
    ...(caps.hyperlinks
      ? [
          Link.configure({
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
          }),
        ]
      : []),
    ...(caps.image_upload ? [Image] : []),
    ...(caps.text_align
      ? [
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
        ]
      : []),
  ];
}

type ToolBtnProps = {
  onClick: () => void;
  active?: boolean;
  locked?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  onLockedClick?: () => void;
};

function ToolBtn({
  onClick,
  active,
  locked,
  disabled,
  title,
  children,
  onLockedClick,
}: ToolBtnProps) {
  const unlockedDisabled = !locked && Boolean(disabled);
  const faded = locked || unlockedDisabled;
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md px-2 text-muted-foreground transition-colors',
        active && !locked && 'bg-background text-foreground shadow-sm',
        !locked && !disabled && 'hover:bg-background/90 hover:text-foreground',
        faded && 'opacity-45',
        locked && onLockedClick && 'cursor-pointer',
        faded && !(locked && onLockedClick) && 'cursor-not-allowed',
      )}
      disabled={locked ? false : Boolean(disabled)}
      title={title}
      aria-pressed={active}
      aria-disabled={locked || Boolean(disabled)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (locked) {
          onLockedClick?.();
          return;
        }
        if (disabled) {
          return;
        }
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="mx-0.5 hidden h-6 w-px shrink-0 bg-border sm:block"
    />
  );
}

function DescriptionToolbar({
  editor,
  caps,
  i18n,
  upgrade,
  onNavigatePackages,
  uploadInlineImage,
}: {
  editor: Editor;
  caps: EditorCapability;
  i18n: JobDescriptionEditorToolbarLabels;
  upgrade?: JobDescriptionLockedUpgradePrompt | null;
  onNavigatePackages?: () => void;
  uploadInlineImage?: (file: File) => Promise<string>;
}) {
  const dlgRef = React.useRef<HTMLDialogElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onLockedInteract = upgrade
    ? (): void => {
        dlgRef.current?.showModal();
      }
    : undefined;

  const link = () => {
    if (!caps.hyperlinks) {
      return;
    }
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(i18n.linkPrompt, prev ?? 'https://');
    if (url === null) {
      return;
    }
    const trimmed = url.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    let href = trimmed;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const insertImageFromUrl = () => {
    if (!caps.image_upload) {
      return;
    }
    const url = window.prompt(i18n.imagePrompt, 'https://');
    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  };

  const onInlineFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !uploadInlineImage || !caps.image_upload) {
      return;
    }
    try {
      const src = await uploadInlineImage(f);
      editor.chain().focus().setImage({ src }).run();
    } catch {
      /* caller may toast */
    }
  };

  const pickImage = () => {
    if (!caps.image_upload) {
      return;
    }
    if (uploadInlineImage) {
      fileRef.current?.click();
      return;
    }
    insertImageFromUrl();
  };

  const lockHint = (label: string, entitled: boolean) =>
    entitled ? label : `${label} — ${i18n.notInPackage}`;

  return (
    <>
      {uploadInlineImage && caps.image_upload ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          aria-hidden
          onChange={onInlineFile}
        />
      ) : null}
      <div
        role="toolbar"
        aria-label={i18n.formattingToolbar}
        className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-muted/40 px-1.5 py-1.5"
      >
        <ToolBtn
          title={lockHint(i18n.undo, true)}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.redo, true)}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title={lockHint(i18n.bold, caps.bold)}
          locked={!caps.bold}
          onLockedClick={onLockedInteract}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.italic, caps.italic)}
          locked={!caps.italic}
          onLockedClick={onLockedInteract}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.underline, caps.underline)}
          locked={!caps.underline}
          onLockedClick={onLockedInteract}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title={lockHint(i18n.heading2, caps.headings)}
          locked={!caps.headings}
          onLockedClick={onLockedInteract}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.heading3, caps.headings)}
          locked={!caps.headings}
          onLockedClick={onLockedInteract}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title={lockHint(i18n.bulletList, caps.lists)}
          locked={!caps.lists}
          onLockedClick={onLockedInteract}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.orderedList, caps.lists)}
          locked={!caps.lists}
          onLockedClick={onLockedInteract}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.blockquote, caps.blockquote)}
          locked={!caps.blockquote}
          onLockedClick={onLockedInteract}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title={lockHint(i18n.inlineCode, caps.inline_code)}
          locked={!caps.inline_code}
          onLockedClick={onLockedInteract}
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.codeBlock, caps.code_block)}
          locked={!caps.code_block}
          onLockedClick={onLockedInteract}
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <span className="font-mono text-xs font-semibold" aria-hidden>
            {'</>'}
          </span>
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title={lockHint(i18n.link, caps.hyperlinks)}
          locked={!caps.hyperlinks}
          onLockedClick={onLockedInteract}
          active={editor.isActive('link')}
          onClick={link}
        >
          <Link2 className="size-4" aria-hidden />
        </ToolBtn>
        <ToolBtn
          title={lockHint(i18n.image, caps.image_upload)}
          locked={!caps.image_upload}
          onLockedClick={onLockedInteract}
          onClick={pickImage}
        >
          <ImageIcon className="size-4" aria-hidden />
        </ToolBtn>

        {caps.text_align ? (
          <>
            <ToolbarDivider />
            <ToolBtn
              title={i18n.alignLeft}
              active={
                editor.isActive({ textAlign: 'left' }) ||
                (!editor.isActive({ textAlign: 'center' }) &&
                  !editor.isActive({ textAlign: 'right' }))
              }
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="size-4" aria-hidden />
            </ToolBtn>
            <ToolBtn
              title={i18n.alignCenter}
              active={editor.isActive({ textAlign: 'center' })}
              onClick={() =>
                editor.chain().focus().setTextAlign('center').run()
              }
            >
              <AlignCenter className="size-4" aria-hidden />
            </ToolBtn>
            <ToolBtn
              title={i18n.alignRight}
              active={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="size-4" aria-hidden />
            </ToolBtn>
          </>
        ) : (
          <>
            <ToolbarDivider />
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-muted-foreground opacity-45 hover:opacity-70"
              title={i18n.notInPackage}
              aria-label={i18n.notInPackage}
              onClick={() => onLockedInteract?.()}
            >
              <AlignLeft className="size-4" aria-hidden />
              <AlignCenter className="size-4" aria-hidden />
              <AlignRight className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>
      {upgrade ? (
        <dialog
          ref={dlgRef}
          className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-4 text-sm text-foreground shadow-lg"
        >
          <h3 className="text-base font-semibold">{upgrade.dialogTitle}</h3>
          <p className="mt-2 text-muted-foreground">{upgrade.dialogBody}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted/60"
              onClick={() => dlgRef.current?.close()}
            >
              {upgrade.closeLabel}
            </button>
            {onNavigatePackages ? (
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-95"
                onClick={() => {
                  dlgRef.current?.close();
                  onNavigatePackages();
                }}
              >
                {upgrade.ctaLabel}
              </button>
            ) : null}
          </div>
        </dialog>
      ) : null}
    </>
  );
}

export function JobDescriptionEditor({
  mountKey,
  initialPlain,
  initialDoc,
  editable = true,
  className,
  editorClassName,
  editorCapabilities,
  onChange,
  toolbarLabels,
  placeholder,
  maxCharacters,
  charCount,
  lockedUpgradePrompt,
  onNavigatePackages,
  uploadInlineImage,
}: JobDescriptionEditorProps) {
  const initialContent = React.useMemo(
    () => docFromInitial(initialDoc, initialPlain),
    [initialDoc, initialPlain],
  );

  const capsKey = JSON.stringify(editorCapabilities);

  const i18n = React.useMemo(
    () => ({ ...DEFAULT_TOOLBAR, ...toolbarLabels }),
    [toolbarLabels],
  );

  const extensions = React.useMemo(
    () => buildExtensions(editorCapabilities, placeholder),
    [editorCapabilities, placeholder],
  );

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const stableOnChange = React.useCallback(
    (payload: { plainText: string; doc: ProseMirrorDoc | null }) => {
      onChangeRef.current(payload);
    },
    [],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class: cn(
            'hf-job-editor-prose min-h-[min(40vh,280px)] w-full border-0 bg-transparent px-3 py-3 text-sm leading-relaxed text-foreground outline-none',
            'prose prose-sm max-w-none dark:prose-invert',
            'prose-headings:scroll-mt-20 prose-headings:font-semibold',
            'prose-p:my-2 prose-li:my-0.5',
            editorClassName,
          ),
        },
      },
      onUpdate: ({ editor: ed }) => {
        stableOnChange({
          plainText: ed.getText(),
          doc: ed.getJSON() as ProseMirrorDoc,
        });
      },
    },
    [mountKey, capsKey, placeholder],
  );

  React.useEffect(() => {
    if (!editor) {
      return;
    }
    stableOnChange({
      plainText: editor.getText(),
      doc: editor.getJSON() as ProseMirrorDoc,
    });
  }, [editor, mountKey, capsKey, placeholder, stableOnChange]);

  React.useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  const showBudget =
    maxCharacters != null &&
    charCount != null &&
    Number.isFinite(maxCharacters) &&
    maxCharacters > 0;

  const overBudget =
    showBudget && (charCount as number) > (maxCharacters as number);
  const budgetRatio = showBudget
    ? Math.min(1, (charCount as number) / (maxCharacters as number))
    : 0;

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-[min(40vh,280px)] w-full rounded-lg border border-input bg-muted/30',
          className,
        )}
      />
    );
  }

  return (
    <div className={cn('hf-job-editor space-y-0', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-input bg-background shadow-sm',
          'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        )}
      >
        <DescriptionToolbar
          editor={editor}
          caps={editorCapabilities}
          i18n={i18n}
          upgrade={lockedUpgradePrompt ?? undefined}
          onNavigatePackages={onNavigatePackages}
          uploadInlineImage={uploadInlineImage}
        />
        <EditorContent editor={editor} />
        {showBudget ? (
          <div className="border-t border-border bg-muted/25 px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {i18n.characterBudget}
              </span>
              <span
                className={cn(
                  'tabular-nums',
                  overBudget
                    ? 'font-semibold text-destructive'
                    : budgetRatio >= 0.9
                      ? 'font-medium text-amber-600 dark:text-amber-400'
                      : 'text-foreground',
                )}
              >
                {(charCount as number).toLocaleString()} /{' '}
                {(maxCharacters as number).toLocaleString()}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxCharacters as number}
              aria-valuenow={Math.min(
                charCount as number,
                maxCharacters as number,
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-200 ease-out',
                  overBudget
                    ? 'bg-destructive'
                    : budgetRatio >= 0.9
                      ? 'bg-amber-500'
                      : 'bg-primary',
                )}
                style={{
                  width: `${Math.min(100, budgetRatio * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
