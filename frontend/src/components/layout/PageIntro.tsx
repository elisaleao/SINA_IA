type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b05a2b]">
        {eyebrow}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
