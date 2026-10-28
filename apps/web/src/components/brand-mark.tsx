import { cn } from '@/lib/cn';

/**
 * The Šljakam mark: an "S" whose caron is a check mark (the job is yours).
 * Glyph paths match scripts/design/make-icons.mjs, which renders the app
 * icons and favicon from the same shapes.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 items-center justify-center rounded-xl shadow-sm',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--gradient-primary-to), var(--gradient-primary-from))',
      }}
    >
      <svg viewBox="0 0 512 512" className="size-full" focusable="false">
        <g transform="translate(0 6)" fill="none" strokeLinecap="round">
          <path
            d="M330 238 C315 212 289 200 258 200 C219 200 192 220 192 252 C192 286 224 296 258 304 C296 312 326 324 326 360 C326 395 297 414 258 414 C223 414 196 401 182 375"
            stroke="white"
            strokeWidth={58}
            strokeLinejoin="round"
          />
          <path
            d="M208 118 L240 148 L306 84"
            stroke="var(--brand-accent)"
            strokeWidth={42}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  );
}
