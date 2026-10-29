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
    <li className="hf-lift hf-reveal rounded-3xl border border-border bg-card p-7">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-2xl bg-featured text-xl font-extrabold text-featured-foreground"
      >
        {step}
      </span>
      <h3 className="m-0 mt-5 text-xl font-bold text-foreground">{title}</h3>
      <p className="m-0 mt-2 leading-relaxed text-muted-foreground">{body}</p>
    </li>
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
      <h2 className="m-0 mb-10 text-center text-3xl font-extrabold tracking-tight text-foreground md:text-[2.125rem]">
        {title}
      </h2>
      <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
        <Step step="1" title={s1Title} body={s1Body} />
        <Step step="2" title={s2Title} body={s2Body} />
        <Step step="3" title={s3Title} body={s3Body} />
      </ol>
    </section>
  );
}
