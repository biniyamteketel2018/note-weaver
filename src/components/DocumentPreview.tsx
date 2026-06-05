import type { StructuredDocument } from "@/lib/analyze.functions";

const calloutClasses: Record<string, { wrap: string; label: string; name: string }> = {
  important: { wrap: "border-l-4 border-[var(--crimson)] bg-[oklch(0.96_0.04_25)]/40", label: "text-[var(--crimson)]", name: "Important" },
  historical: { wrap: "border-l-4 border-[var(--gold)] bg-[oklch(0.96_0.04_75)]/40", label: "text-[var(--gold)]", name: "Historical Context" },
  insight: { wrap: "border-l-4 border-[var(--sage)] bg-[oklch(0.96_0.03_160)]/40", label: "text-[var(--sage)]", name: "Key Insight" },
  warning: { wrap: "border-l-4 border-[var(--crimson)] bg-[oklch(0.96_0.04_25)]/40", label: "text-[var(--crimson)]", name: "Warning" },
  definition: { wrap: "border-l-4 border-ink bg-secondary", label: "text-ink", name: "Definition" },
  quote: { wrap: "", label: "", name: "Quote" },
};

export function DocumentPreview({
  doc,
  coverImage,
}: {
  doc: StructuredDocument;
  coverImage?: string | null;
}) {
  return (
    <article className="mx-auto max-w-3xl bg-card text-card-foreground shadow-2xl">
      {/* Cover */}
      <header className="relative">
        {coverImage ? (
          <img src={coverImage} alt="" className="h-72 w-full object-cover sm:h-96" />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-ink to-[var(--gold)]" />
        )}
        <div className="px-8 py-10 sm:px-14 sm:py-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
            {doc.category} · Educational Brief
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">{doc.title}</h1>
          <p className="mt-4 max-w-prose font-serif text-lg italic text-muted-foreground sm:text-2xl">{doc.subtitle}</p>
          <div className="mt-10 flex justify-between border-t border-rule pt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>Notable · AI Editorial</span>
          </div>
        </div>
      </header>

      <div className="px-8 pb-14 sm:px-14">
        {/* Executive Summary */}
        <section className="py-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Executive Summary</p>
          <h2 className="mt-2 font-display text-3xl font-bold">In Brief</h2>
          <p className="mt-4 font-serif text-lg italic leading-relaxed text-muted-foreground">{doc.executiveSummary}</p>
        </section>

        <hr className="border-rule" />

        {/* TOC */}
        <section className="py-10">
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
        {doc.sections.map((sec, i) => (
          <section key={i} className="border-t border-rule py-12">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">
              Chapter {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{sec.heading}</h2>
            {sec.intro ? <p className="mt-3 font-serif text-lg italic text-muted-foreground">{sec.intro}</p> : null}
            <hr className="my-6 border-rule" />

            <div className="space-y-4 text-justify leading-relaxed">
              {sec.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>

            {sec.callouts?.map((c, k) => {
              if (c.type === "quote") {
                return (
                  <blockquote key={k} className="my-6 bg-ink p-6 text-paper">
                    <div className="font-serif text-4xl leading-none text-[var(--gold)]">“</div>
                    <p className="font-serif text-xl italic leading-snug text-paper">{c.body}</p>
                    {c.title ? (
                      <footer className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">— {c.title}</footer>
                    ) : null}
                  </blockquote>
                );
              }
              const cs = calloutClasses[c.type] ?? calloutClasses.definition;
              return (
                <aside key={k} className={`my-5 px-5 py-4 ${cs.wrap}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${cs.label}`}>{cs.name}</p>
                  {c.title ? <p className="mt-1 font-display text-lg font-semibold">{c.title}</p> : null}
                  <p className="mt-1 text-sm leading-relaxed">{c.body}</p>
                </aside>
              );
            })}

            {sec.timeline && sec.timeline.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-display text-lg font-semibold">Timeline</h3>
                <ol className="mt-3 border-l border-[var(--gold)] pl-5">
                  {sec.timeline.map((t, k) => (
                    <li key={k} className="mb-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{t.date}</p>
                      <p className="font-display text-lg font-semibold">{t.title}</p>
                      {t.description ? <p className="text-sm text-muted-foreground">{t.description}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {sec.table ? (
              <div className="mt-6 overflow-x-auto">
                <h3 className="font-display text-lg font-semibold">{sec.table.caption ?? "Comparison"}</h3>
                <table className="mt-3 w-full border-t border-ink text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      {sec.table.headers.map((h, k) => (
                        <th key={k} className="border-b border-rule p-2 text-left text-[10px] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.table.rows.map((row, k) => (
                      <tr key={k}>
                        {row.map((cell, m) => (
                          <td key={m} className="border-b border-rule p-2 align-top">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {sec.takeaways && sec.takeaways.length > 0 ? (
              <div className="mt-8 border border-[var(--gold)] p-5">
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
          </section>
        ))}

        {/* Final */}
        <section className="border-t border-rule py-12">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Conclusion</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Final Summary</h2>
          <hr className="my-6 border-rule" />
          <p className="leading-relaxed">{doc.finalSummary}</p>

          {doc.references && doc.references.length > 0 ? (
            <div className="mt-10">
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
