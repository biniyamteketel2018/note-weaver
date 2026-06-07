import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentPreview } from "@/components/DocumentPreview";
import { PdfDocument } from "@/components/PdfDocument";
import { analyzeNotes, type StructuredDocument } from "@/lib/analyze.functions";
import { PALETTES, DEFAULT_PALETTE, type Palette } from "@/lib/palettes";

import { FileText, Sparkles, Download, Upload, Loader2, FileDown, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notable — Turn Notes Into Premium PDFs" },
      {
        name: "description",
        content:
          "Paste raw notes and instantly generate a beautifully designed, magazine-quality educational PDF — complete with cover, callouts, timelines, and key takeaways.",
      },
      { property: "og:title", content: "Notable — Notes to Premium PDF" },
      {
        property: "og:description",
        content: "AI-powered editorial design that transforms messy notes into world-class documents.",
      },
    ],
  }),
  component: Index,
});

const SAMPLE = `World War II began on September 1, 1939 when Germany invaded Poland.
Major turning points: Battle of Britain (1940), Operation Barbarossa (June 1941),
Pearl Harbor (Dec 7, 1941), Stalingrad (1942-43), D-Day (June 6, 1944).
War ended in Europe May 8, 1945 (VE Day) and Pacific Sept 2, 1945 after Hiroshima
and Nagasaki. Key figures: Churchill, FDR, Stalin, Hitler, Tojo. Outcomes: UN
formed, Cold War began, decolonization accelerated, ~70-85 million dead.`;

function Index() {
  const analyze = useServerFn(analyzeNotes);

  const [notes, setNotes] = useState("");
  const [doc, setDoc] = useState<StructuredDocument | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const [status, setStatus] = useState<"idle" | "analyzing" | "exporting">("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const onUpload = useCallback(async (f: File) => {
    const text = await f.text();
    setNotes(text);
    toast.success(`Loaded ${f.name}`);
  }, []);

  const generate = useCallback(async () => {
    if (notes.trim().length < 10) {
      toast.error("Paste some notes first (at least 10 characters).");
      return;
    }
    setDoc(null);
    setCoverImage(null);
    setStatus("analyzing");
    try {
      const result = await analyze({ data: { notes } });
      setDoc(result);
      setCoverImage(result.coverImage ?? null);
      setStatus("idle");
      toast.success("Document ready");
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setStatus("idle");
      const msg = e instanceof Error ? e.message : "Failed to analyze notes";
      toast.error(msg);
    }
  }, [notes, analyze]);

  const downloadPdf = useCallback(async () => {
    if (!doc) {
      toast.error("Generate a document first.");
      return;
    }
    setStatus("exporting");
    try {
      const blob = await pdf(<PdfDocument doc={doc} coverImage={coverImage} palette={palette} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setStatus("idle");
    }
  }, [doc, coverImage, palette]);

  const busy = status !== "idle";

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Masthead */}
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-ink text-paper">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-xl font-bold leading-none">Notable</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">AI Editorial · Notes to PDF</p>
            </div>
          </div>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">
            Vol. 1 · {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      {/* Hero / Input */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">A New Way to Read Your Notes</p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
          Paste notes.<br />
          <span className="italic text-muted-foreground">Receive a publication.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Drop in your raw, messy notes — lectures, research, scripture, business briefs.
          Our editorial AI restructures them into a premium, magazine-quality PDF with cover art,
          timelines, callouts, and a designed table of contents.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Paste your notes here — any topic, any length.\n\nAdd images by pasting URLs:\n(cover: https://example.com/hero.jpg)\n(image: https://example.com/figure.jpg)\n![caption](https://example.com/photo.jpg)\nor any direct image URL on its own line.`}
              className="min-h-72 resize-y border-rule bg-card font-serif text-base leading-relaxed shadow-sm"
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                <Upload className="mr-2 h-3.5 w-3.5" /> Upload .txt / .md
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNotes(SAMPLE)} disabled={busy}>
                Try a sample
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">{notes.length.toLocaleString()} characters</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-64">
            <Button size="lg" onClick={generate} disabled={busy} className="h-14 bg-ink text-paper hover:bg-ink/90">
              {status === "analyzing" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Formatting…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Document</>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={downloadPdf}
              disabled={!doc || busy}
              className="h-14 border-ink"
            >
              {status === "exporting" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building PDF…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download PDF</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              <FileDown className="mr-1 inline h-3 w-3" />
              A4 · multi-page · embedded fonts &amp; images · print-ready.
            </p>
          </div>
        </div>

        {!doc && !busy ? (
          <div className="mt-16 grid gap-6 border-t border-rule pt-10 sm:grid-cols-3">
            {[
              { k: "Editorial Structure", v: "Cover, summary, TOC, chapters, takeaways, references — automatic." },
              { k: "Visual Layout", v: "Callouts, timelines, comparison tables, quote cards, hero imagery." },
              { k: "Print-Ready PDF", v: "A4, embedded serif typography, page numbers, headers, footers." },
            ].map((f) => (
              <div key={f.k}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">{f.k}</p>
                <p className="mt-2 font-serif text-base leading-relaxed">{f.v}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Preview */}
      {doc ? (
        <section ref={previewRef} className="border-t border-rule bg-secondary/40 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Live Preview</p>
                <h2 className="mt-2 font-display text-3xl font-bold">Your Document</h2>
              </div>
              <Button onClick={downloadPdf} disabled={busy} className="bg-ink text-paper hover:bg-ink/90">
                {status === "exporting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building PDF…</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Download PDF</>
                )}
              </Button>
            </div>

            {/* Palette picker */}
            <div className="mb-8 rounded-sm border border-rule bg-card p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">
                  PDF Color Palette
                </p>
                <p className="text-xs text-muted-foreground">Applied to the exported PDF</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {PALETTES.map((p) => {
                  const selected = p.id === palette.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPalette(p)}
                      className={`group relative flex flex-col items-stretch overflow-hidden rounded-sm border-2 text-left transition ${
                        selected ? "border-ink shadow-md" : "border-rule hover:border-ink/60"
                      }`}
                      style={{ backgroundColor: p.paper }}
                    >
                      <div className="flex h-10">
                        <div className="flex-1" style={{ backgroundColor: p.ink }} />
                        <div className="flex-1" style={{ backgroundColor: p.accent }} />
                        <div className="flex-1" style={{ backgroundColor: p.soft }} />
                        <div className="flex-1" style={{ backgroundColor: p.sage }} />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold" style={{ color: p.ink }}>
                          {p.name}
                        </span>
                        {selected ? (
                          <Check className="h-3.5 w-3.5" style={{ color: p.accent }} />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <DocumentPreview doc={doc} coverImage={coverImage} />
          </div>
        </section>
      ) : null}

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span>© {new Date().getFullYear()} Notable</span>
          <span>Crafted with editorial AI</span>
        </div>
      </footer>
    </div>
  );
}
