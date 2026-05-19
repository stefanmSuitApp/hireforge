function Step({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative z-[1] mb-5 flex size-16 items-center justify-center rounded-full border-2 border-primary/25 bg-card">
        <span className="text-xl font-bold text-primary">{step}</span>
      </div>

      <h3 className="m-0 mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="m-0 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

export function HomeHowItWorks({
  title,
  s1Title,
  s1Body,
  s2Title,
  s2Body,
  s3Title,
  s3Body,
}: {
  title: string;
  s1Title: string;
  s1Body: string;
  s2Title: string;
  s2Body: string;
  s3Title: string;
  s3Body: string;
}) {
  return (
    <section>
      <h2 className="m-0 mb-12 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      <div className="relative mx-auto grid max-w-4xl gap-12 md:grid-cols-3 md:gap-8">
        {/* Dashed line from circle 1 to circle 2 */}
        <div
          className="absolute left-[calc(16.67%+1.4rem)] top-[2rem] hidden h-px w-[calc(33.33%-1.5rem)] border-t-2 border-dashed border-border/60 md:block"
          aria-hidden
        />
        {/* Dashed line from circle 2 to circle 3 */}
        <div
          className="absolute left-[calc(50%+2.1rem)] top-[2rem] hidden h-px w-[calc(33.33%-1.5rem)] border-t-2 border-dashed border-border/60 md:block"
          aria-hidden
        />
        <Step step="1" title={s1Title} body={s1Body} />
        <Step step="2" title={s2Title} body={s2Body} />
        <Step step="3" title={s3Title} body={s3Body} />
      </div>
    </section>
  );
}
