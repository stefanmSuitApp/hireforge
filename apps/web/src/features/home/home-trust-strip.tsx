export function HomeTrustStrip({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/[0.06] px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground">
      <span
        className="inline-block size-2 rounded-full bg-emerald-500"
        aria-hidden
      />
      {text}
    </div>
  );
}
