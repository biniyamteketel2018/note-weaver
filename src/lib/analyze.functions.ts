import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  notes: z.string().min(1).max(100000),
});

export type Callout = {
  type: "important" | "historical" | "insight" | "warning" | "definition" | "quote";
  title?: string;
  body: string;
};

export type TimelineItem = { date: string; title: string; description?: string };
export type TableSpec = { headers: string[]; rows: string[][]; caption?: string };

export type Section = {
  heading: string;
  intro?: string;
  paragraphs: string[];
  callouts?: Callout[];
  timeline?: TimelineItem[];
  table?: TableSpec;
  takeaways?: string[];
  image?: string;
};

export type StructuredDocument = {
  title: string;
  subtitle: string;
  category: string;
  executiveSummary: string;
  sections: Section[];
  finalSummary: string;
  references?: string[];
  coverImage?: string | null;
};

// ---------- Image extraction ----------

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?.*)?$/i;

type ImageMarker = { kind: "cover" | "section"; url: string; line: number };

function extractImages(raw: string): { lines: string[]; markers: ImageMarker[] } {
  const rawLines = raw.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  const markers: ImageMarker[] = [];

  for (const line of rawLines) {
    let working = line;
    let consumed = false;

    working = working.replace(/\(cover:\s*(https?:\/\/[^\s)]+)\s*\)/gi, (_m, url) => {
      markers.push({ kind: "cover", url, line: lines.length });
      consumed = true;
      return "";
    });
    working = working.replace(/\(image:\s*(https?:\/\/[^\s)]+)\s*\)/gi, (_m, url) => {
      markers.push({ kind: "section", url, line: lines.length });
      consumed = true;
      return "";
    });
    working = working.replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, (_m, url) => {
      markers.push({ kind: "section", url, line: lines.length });
      consumed = true;
      return "";
    });
    // Bare image URL on its own line
    const trimmed = working.trim();
    if (/^https?:\/\/\S+$/.test(trimmed) && IMG_EXT.test(trimmed)) {
      markers.push({ kind: "section", url: trimmed, line: lines.length });
      working = "";
      consumed = true;
    }

    if (consumed && working.trim() === "") {
      // skip line entirely if it only held image syntax
      continue;
    }
    lines.push(working);
  }

  return { lines, markers };
}

// ---------- Document parser ----------

function isHeading(line: string): { level: number; text: string } | null {
  const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
  if (!m) return null;
  return { level: m[1].length, text: m[2].trim() };
}

function isBullet(line: string): string | null {
  const m = /^\s*[-*•]\s+(.+)$/.exec(line);
  return m ? m[1].trim() : null;
}

function isQuote(line: string): string | null {
  const m = /^\s*>\s?(.*)$/.exec(line);
  return m ? m[1] : null;
}

function isCalloutTag(line: string): { type: Callout["type"]; rest: string } | null {
  const m = /^\s*\[!(important|warning|insight|note|definition|historical|quote|tip)\]\s*(.*)$/i.exec(line);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const map: Record<string, Callout["type"]> = {
    important: "important",
    warning: "warning",
    insight: "insight",
    note: "insight",
    tip: "insight",
    definition: "definition",
    historical: "historical",
    quote: "quote",
  };
  return { type: map[raw], rest: m[2].trim() };
}

function isTimelineLine(line: string): { date: string; title: string } | null {
  // "1939: Germany invades Poland"  or "1939 — Germany invades Poland"
  const m = /^\s*((?:\d{1,4}(?:[-/]\d{1,2}){0,2})|(?:[A-Z][a-z]+ \d{1,2},? \d{4})|(?:\d{4}s?))\s*[:\-—–]\s*(.+)$/.exec(
    line,
  );
  return m ? { date: m[1].trim(), title: m[2].trim() } : null;
}

function isTableRow(line: string): string[] | null {
  if (!/^\s*\|.*\|\s*$/.test(line)) return null;
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function flushParagraph(buf: string[], target: string[]) {
  const text = buf.join(" ").trim();
  if (text) target.push(text);
  buf.length = 0;
}

function parseSectionBody(
  lines: string[],
  startLine: number,
): { section: Omit<Section, "heading">; consumedLines: number[] } {
  const paragraphs: string[] = [];
  const callouts: Callout[] = [];
  const timeline: TimelineItem[] = [];
  const takeaways: string[] = [];
  let table: TableSpec | undefined;
  const consumedLines: number[] = [];

  const pBuf: string[] = [];
  let quoteBuf: string[] = [];
  let calloutBuf: { type: Callout["type"]; lines: string[] } | null = null;
  let bulletBuf: string[] = [];
  let timelineBuf: TimelineItem[] = [];
  let tableBuf: string[][] = [];

  const finalizeQuote = () => {
    if (quoteBuf.length) {
      callouts.push({ type: "quote", body: quoteBuf.join(" ").trim() });
      quoteBuf = [];
    }
  };
  const finalizeCallout = () => {
    if (calloutBuf && calloutBuf.lines.length) {
      callouts.push({ type: calloutBuf.type, body: calloutBuf.lines.join(" ").trim() });
    }
    calloutBuf = null;
  };
  const finalizeBullets = () => {
    if (bulletBuf.length >= 2) {
      takeaways.push(...bulletBuf);
    } else if (bulletBuf.length === 1) {
      paragraphs.push("• " + bulletBuf[0]);
    }
    bulletBuf = [];
  };
  const finalizeTimeline = () => {
    if (timelineBuf.length >= 2) {
      timeline.push(...timelineBuf);
    } else if (timelineBuf.length === 1) {
      const it = timelineBuf[0];
      paragraphs.push(`${it.date}: ${it.title}`);
    }
    timelineBuf = [];
  };
  const finalizeTable = () => {
    if (tableBuf.length >= 2) {
      const [headers, ...rows] = tableBuf;
      table = { headers, rows };
    }
    tableBuf = [];
  };
  const flushAll = () => {
    flushParagraph(pBuf, paragraphs);
    finalizeQuote();
    finalizeCallout();
    finalizeBullets();
    finalizeTimeline();
    finalizeTable();
  };

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const h = isHeading(line);
    if (h && h.level <= 2) {
      // section boundary
      flushAll();
      return { section: { paragraphs, callouts: callouts.length ? callouts : undefined, timeline: timeline.length ? timeline : undefined, table, takeaways: takeaways.length ? takeaways : undefined }, consumedLines };
    }
    consumedLines.push(i);

    // h3 → sub paragraph emphasis
    if (h && h.level === 3) {
      flushAll();
      paragraphs.push(h.text.toUpperCase());
      continue;
    }

    // Table
    const rowCells = isTableRow(line);
    if (rowCells) {
      flushParagraph(pBuf, paragraphs);
      finalizeBullets();
      finalizeTimeline();
      finalizeQuote();
      finalizeCallout();
      // skip separators
      if (isTableSeparator(line)) continue;
      tableBuf.push(rowCells);
      continue;
    } else if (tableBuf.length) {
      finalizeTable();
    }

    // Callout tag start
    const ct = isCalloutTag(line);
    if (ct) {
      flushAll();
      calloutBuf = { type: ct.type, lines: ct.rest ? [ct.rest] : [] };
      continue;
    }

    // Quote
    const q = isQuote(line);
    if (q !== null) {
      flushParagraph(pBuf, paragraphs);
      finalizeBullets();
      finalizeTimeline();
      finalizeCallout();
      if (q.trim()) quoteBuf.push(q.trim());
      continue;
    } else {
      finalizeQuote();
    }

    // Timeline
    const tl = isTimelineLine(line);
    if (tl) {
      flushParagraph(pBuf, paragraphs);
      finalizeBullets();
      finalizeCallout();
      timelineBuf.push(tl);
      continue;
    } else if (timelineBuf.length) {
      finalizeTimeline();
    }

    // Bullet
    const b = isBullet(line);
    if (b !== null) {
      flushParagraph(pBuf, paragraphs);
      finalizeCallout();
      bulletBuf.push(b);
      continue;
    } else if (bulletBuf.length) {
      finalizeBullets();
    }

    // Blank line
    if (line.trim() === "") {
      flushParagraph(pBuf, paragraphs);
      finalizeCallout();
      continue;
    }

    // Continuation of callout?
    if (calloutBuf) {
      calloutBuf.lines.push(line.trim());
      continue;
    }

    pBuf.push(line.trim());
  }

  flushAll();
  return {
    section: {
      paragraphs,
      callouts: callouts.length ? callouts : undefined,
      timeline: timeline.length ? timeline : undefined,
      table,
      takeaways: takeaways.length ? takeaways : undefined,
    },
    consumedLines,
  };
}

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  const checks: [string, string[]][] = [
    ["History", ["war", "century", "empire", "revolution", "ancient", "kingdom", "treaty"]],
    ["Science", ["atom", "cell", "molecule", "physics", "biology", "chemistry", "equation", "energy"]],
    ["Technology", ["software", "algorithm", "computer", "ai ", "machine learning", "code", "api"]],
    ["Business", ["revenue", "market", "company", "strategy", "customer", "profit", "startup"]],
    ["Economics", ["inflation", "gdp", "supply", "demand", "currency", "trade", "tariff"]],
    ["Philosophy", ["ethics", "morality", "existence", "epistemic", "metaphysics"]],
    ["Religion", ["god", "scripture", "prayer", "faith", "spiritual", "divine"]],
    ["Politics", ["government", "election", "policy", "parliament", "senate", "vote"]],
  ];
  for (const [cat, kws] of checks) {
    if (kws.some((k) => t.includes(k))) return cat;
  }
  return "Notes";
}

function parseDocument(rawLines: string[]): Omit<StructuredDocument, "coverImage"> {
  // Strip leading blank lines
  let i = 0;
  while (i < rawLines.length && rawLines[i].trim() === "") i++;

  // Title detection
  let title = "Untitled Document";
  let subtitle = "";
  const first = rawLines[i];
  if (first) {
    const h = isHeading(first);
    if (h && h.level === 1) {
      title = h.text;
      i++;
    } else {
      title = first.trim();
      i++;
    }
  }
  // Optional subtitle: next non-blank, non-heading line
  while (i < rawLines.length && rawLines[i].trim() === "") i++;
  if (i < rawLines.length) {
    const nxt = rawLines[i];
    const h = isHeading(nxt);
    if (!h && nxt.trim() && !isBullet(nxt) && !isQuote(nxt) && nxt.trim().length < 200) {
      // Only take as subtitle if the following line is blank/heading (so it's clearly standalone)
      const after = rawLines[i + 1] ?? "";
      if (after.trim() === "" || isHeading(after)) {
        subtitle = nxt.trim();
        i++;
      }
    }
  }

  // Optional executive summary: paragraph(s) before first H2
  const preLines: string[] = [];
  while (i < rawLines.length) {
    const h = isHeading(rawLines[i]);
    if (h && h.level <= 2) break;
    preLines.push(rawLines[i]);
    i++;
  }
  const executiveSummary = preLines
    .filter((l) => l.trim() && !isBullet(l) && !isQuote(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Sections (H1 or H2 = section)
  const sections: Section[] = [];
  while (i < rawLines.length) {
    const h = isHeading(rawLines[i]);
    if (h && h.level <= 2) {
      const heading = h.text;
      const { section, consumedLines } = parseSectionBody(rawLines, i + 1);
      sections.push({ heading, ...section });
      i = (consumedLines[consumedLines.length - 1] ?? i) + 1;
    } else {
      i++;
    }
  }

  // If no sections detected, build one big "Notes" section
  if (sections.length === 0) {
    const { section } = parseSectionBody(rawLines, 0);
    if (section.paragraphs.length || section.callouts || section.takeaways) {
      sections.push({ heading: "Notes", ...section });
    }
  }

  const allText = rawLines.join(" ");
  const category = detectCategory(allText);

  return {
    title,
    subtitle: subtitle || (sections[0]?.heading ?? "A formatted document"),
    category,
    executiveSummary: executiveSummary || "",
    sections,
    finalSummary: "",
    references: [],
  };
}

// ---------- Server fetch images ----------

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

export const analyzeNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<StructuredDocument> => {
    const { lines, markers } = extractImages(data.notes);
    const doc = parseDocument(lines);

    // Resolve images
    const urls = markers.map((m) => m.url);
    const fetched = await Promise.all(urls.map(fetchAsDataUrl));

    let coverImage: string | null = null;
    const sectionMarkers: { url: string; line: number; data: string }[] = [];
    markers.forEach((m, idx) => {
      const d = fetched[idx];
      if (!d) return;
      if (m.kind === "cover" && !coverImage) coverImage = d;
      else sectionMarkers.push({ url: m.url, line: m.line, data: d });
    });

    // Distribute section images sequentially across sections
    doc.sections.forEach((sec, i) => {
      if (sectionMarkers[i]) sec.image = sectionMarkers[i].data;
    });
    if (!coverImage && sectionMarkers.length > 0) {
      coverImage = sectionMarkers[0].data;
    }

    return { ...doc, coverImage };
  });
