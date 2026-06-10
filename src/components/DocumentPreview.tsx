import type { StructuredDocument } from "@/lib/analyze.functions";

function pickPullQuote(sec: {
  paragraphs: string[];
  callouts?: { type: string; body: string }[];
}): string | null {
  const q = sec.callouts?.find((c) => c.type === "quote");
  if (q?.body) return q.body;
  for (const p of sec.paragraphs) {
    const sentences = p.split(/(?<=[.!?])\s+/);
    const s = sentences.find((x) => x.length > 60 && x.length < 220);
    if (s) return s.trim();
  }
  return null;
}

const calloutClasses: Record<string, { wrap: string; label: string; name: string }> = {
  important: { wrap: "border-l-4 border-[var(--crimson)] bg-[#fbeaea]", label: "text-[var(--crimson)]", name: "Important" },
  historical: { wrap: "border-l-4 border-[var(--gold)] bg-[#fbf1de]", label: "text-[var(--gold)]", name: "Historical Context" },
  insight: { wrap: "border-l-4 border-[var(--sage)] bg-[#eaf3ee]", label: "text-[var(--sage)]", name: "Key Insight" },
  warning: { wrap: "border-l-4 border-[var(--crimson)] bg-[#fbeaea]", label: "text-[var(--crimson)]", name: "Warning" },
  definition: { wrap: "border-l-4 border-ink bg-secondary", label: "text-ink", name: "Definition" },
  quote: { wrap: "", label: "", name: "Quote" },
};

export function DocumentPreview({
  doc,
  coverImage,
  forExport = false,
}: {
  doc: StructuredDocument;
  coverImage?: string | null;
  forExport?: boolean;
}) {
  return (
    <article
      className={
        forExport
          ? "mx-auto w-full bg-card text-card-foreground"
          : "mx-auto max-w-3xl bg-card text-card-foreground shadow-2xl"
      }
    >
      {/* Cover */}
      <header className="relative" data-pdf-keep>
        {coverImage ? (
          <img src={coverImage} alt="" className="h-72 w-full object-cover sm:h-96" crossOrigin="anonymous" />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-ink to-[var(--gold)]" />
        )}
        <div className="px-8 py-10 sm:px-14 sm:py-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
            {doc.category}
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">{doc.title}</h1>
          <p className="mt-4 max-w-prose font-serif text-lg italic text-muted-foreground sm:text-2xl">{doc.subtitle}</p>
          <div className="mt-10 flex justify-between border-t border-rule pt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>{doc.category}</span>
          </div>
        </div>
      </header>

      <div className="px-8 pb-14 sm:px-14">
        {/* Executive Summary */}
        <section className="py-10" data-pdf-keep>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Executive Summary</p>
          <h2 className="mt-2 font-display text-3xl font-bold">In Brief</h2>
          <p className="mt-4 font-serif text-lg italic leading-relaxed text-muted-foreground">{doc.executiveSummary}</p>
        </section>

        <hr className="border-rule" />

        {/* TOC */}
        <section className="py-10" data-pdf-keep>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Contents</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Table of Contents</h2>
          <ol className="mt-6 divide-y divide-rule">
            {doc.sections.map((s, i) => (
              <li key={i} className="flex items-baseline gap-4 py-3">
                <span className="font-mono text-sm font-bold text-[var(--gold)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-xl">{s.heading}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Sections */}
        {doc.sections.map((sec, i) => {
          const num = String(i + 1).padStart(2, "0");
          const pull = pickPullQuote(sec);
          const intro = sec.intro || sec.paragraphs[0] || "";
          const bodyParagraphs = sec.intro ? sec.paragraphs : sec.paragraphs.slice(1);
          const nonQuoteCallouts = sec.callouts?.filter((c) => c.type !== "quote") ?? [];
          const quoteCallouts = sec.callouts?.filter((c) => c.type === "quote") ?? [];

          return (
            <section key={i} className="border-t border-rule">
              {/* Chapter opener */}
              <div className="-mx-8 sm:-mx-14" data-pdf-keep>
                {sec.image ? (
                  <img src={sec.image} alt="" className="h-64 w-full object-cover sm:h-96" crossOrigin="anonymous" />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-ink/90 to-[var(--gold)]/30" />
                )}
              </div>
              <div className="relative pt-8" data-pdf-keep>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Chapter {num}</p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-2 right-0 select-none font-display text-[160px] font-bold leading-none text-[var(--gold)]/15 sm:text-[200px]"
                >
                  {num}
                </div>
                <h2 className="relative mt-2 font-display text-4xl font-bold sm:text-5xl">{sec.heading}</h2>
                {pull ? (
                  <p className="relative mt-6 border-l-4 border-[var(--gold)] pl-5 font-serif text-xl italic leading-snug text-ink sm:text-2xl">
                    “{pull}”
                  </p>
                ) : null}
                {intro ? (
                  <p className="relative mt-6 font-serif text-lg leading-relaxed text-muted-foreground">
                    {intro}
                  </p>
                ) : null}
              </div>

              <hr className="my-8 border-rule" />

              <div className="space-y-4 text-justify leading-relaxed">
                {bodyParagraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>

              {nonQuoteCallouts.map((c, k) => {
                const cs = calloutClasses[c.type] ?? calloutClasses.definition;
                return (
                  <aside key={k} className={`my-5 px-5 py-4 ${cs.wrap}`} data-pdf-keep>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${cs.label}`}>{cs.name}</p>
                    {c.title ? <p className="mt-1 font-display text-lg font-semibold">{c.title}</p> : null}
                    <p className="mt-1 text-sm leading-relaxed">{c.body}</p>
                  </aside>
                );
              })}

              {/* Giant centered quotes */}
              {quoteCallouts.map((q, k) => (
                <blockquote
                  key={`q-${k}`}
                  data-pdf-keep
                  className="-mx-8 my-10 flex flex-col items-center bg-ink px-8 py-16 text-center text-paper sm:-mx-14 sm:px-14 sm:py-24"
                >
                  <div className="font-serif text-7xl leading-none text-[var(--gold)] sm:text-8xl">“</div>
                  <p className="mt-2 max-w-2xl font-serif text-2xl font-bold italic leading-snug text-paper sm:text-4xl">
                    {q.body}
                  </p>
                  <div className="mt-8 h-px w-16 bg-[var(--gold)]" />
                  <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                    {q.title || ""}
                  </p>
                </blockquote>
              ))}

              {/* Visual timeline */}
              {sec.timeline && sec.timeline.length > 0 ? (
                <div className="my-8" data-pdf-keep>
                  <h3 className="font-display text-xl font-bold">Timeline</h3>
                  <div className="relative mt-6 pl-10">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--gold)]" />
                    <ol className="space-y-5">
                      {sec.timeline.map((t, k) => (
                        <li key={k} className="relative" data-pdf-keep>
                          <span className="absolute -left-[34px] top-1 h-4 w-4 rounded-full border-2 border-[var(--gold)] bg-paper" />
                          <div className="border-l-4 border-[var(--gold)] bg-secondary p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{t.date}</p>
                            <p className="mt-1 font-display text-lg font-semibold">{t.title}</p>
                            {t.description ? <p className="mt-1 text-sm text-muted-foreground">{t.description}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}

              {/* Polished comparison table */}
              {sec.table ? (
                <div className="my-8 overflow-x-auto" data-pdf-keep>
                  <h3 className="font-display text-xl font-bold">{sec.table.caption ?? "Comparison"}</h3>
                  <div className="mt-3 overflow-hidden rounded-sm border border-rule">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-ink text-paper">
                          {sec.table.headers.map((h, k) => (
                            <th
                              key={k}
                              className="p-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.table.rows.map((row, k) => (
                          <tr key={k} className={k % 2 === 1 ? "bg-secondary/60" : ""}>
                            {row.map((cell, m) => (
                              <td key={m} className="border-t border-rule p-3 align-top">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {sec.takeaways && sec.takeaways.length > 0 ? (
                <div className="my-8 border border-[var(--gold)] p-5" data-pdf-keep>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">Key Takeaways</p>
                  <ul className="mt-3 space-y-2">
                    {sec.takeaways.map((t, k) => (
                      <li key={k} className="flex gap-3 text-sm leading-relaxed">
                        <span className="font-bold text-[var(--gold)]">◆</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="pb-12" />
            </section>
          );
        })}

        {/* Final */}
        <section className="border-t border-rule py-12" data-pdf-keep>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Conclusion</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Final Summary</h2>
          <hr className="my-6 border-rule" />
          <p className="leading-relaxed">{doc.finalSummary}</p>

          {doc.references && doc.references.length > 0 ? (
            <div className="mt-10" data-pdf-keep>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">References</p>
              <h3 className="mt-2 font-display text-2xl font-bold">Sources & Further Reading</h3>
              <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                {doc.references.map((r, i) => (
                  <li key={i}>
                    {i + 1}. {r}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}
