import { cn } from '@/lib/utils';

export interface BrandWordmarkProps {
  /** Visible text. Always pass the diacritic form ("Šljakam"). */
  text: string;
  size?: 'sm' | 'md';
  className?: string;
}

// THROWAWAY placeholder. Replace this component's body with the final asset
// (inline SVG or <img src="/brand/wordmark.svg" />) once design is ready.
// See PRODUCT_SSOT_SLJAKAM.md (brand split rule).
export function BrandWordmark({
  text,
  size = 'md',
  className,
}: BrandWordmarkProps) {
  const sizeClass =
    size === 'sm' ? 'text-lg md:text-xl' : 'text-xl md:text-2xl tracking-tight';
  return (
    <span
      aria-label={text}
      className={cn(
        'inline-block font-extrabold tracking-tight',
        'bg-gradient-to-r from-[var(--gradient-primary-from)] via-[var(--gradient-primary-via)] to-[var(--gradient-primary-to)] bg-clip-text text-transparent',
        sizeClass,
        className,
      )}
    >
      {text}
    </span>
  );
}
