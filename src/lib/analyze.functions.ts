import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  notes: z.string().min(10).max(50000),
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
  image?: string; // data URL embedded after fetch
};

export type StructuredDocument = {
  title: string;
  subtitle: string;
  category: string;
  executiveSummary: string;
  sections: Section[];
  finalSummary: string;
  references?: string[];
  coverImage?: string | null; // data URL
};

const SYSTEM_PROMPT = `You are an editorial designer organizing a user's notes into a premium educational document.

ABSOLUTE CONTENT-PRESERVATION RULE:
- You MUST preserve the user's exact wording. Do NOT rewrite, paraphrase, summarize, expand, simplify, or invent any content.
- Every paragraph, callout, timeline item, table cell, takeaway, and reference MUST be composed of text that appears in the user's notes (you may split or regroup sentences, but you may NOT change their wording).
- The only text you may author freely is structural scaffolding: the document title (derive from notes), subtitle (derive from notes), category label, section headings (derive from the topic of the grouped notes), and short intro lines that quote or directly reference the user's words.
- The "executiveSummary" and "finalSummary" MUST be assembled from sentences taken directly from the notes — do not write new prose.
- If the notes are sparse, keep sections short. Never pad with invented content.

YOUR JOB IS ORGANIZATION & LAYOUT, NOT WRITING:
- Group related notes into logical sections (3-7) with clear headings.
- Identify chronological items → timeline (date + title + optional description, all taken from the notes).
- Identify comparisons → table.
- Identify definitions, key insights, important warnings, notable quotes → callouts (body text verbatim from notes).
- Identify summary-style bullets → takeaways (verbatim).
- Detect dominant category (history, business, science, technology, philosophy, religion, economics, politics, research, education, general).

Output ONLY the JSON via the tool. No prose.`;

// ---------- Image URL extraction ----------

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?.*)?$/i;

function extractImages(raw: string): { cleaned: string; cover?: string; sectionImages: string[] } {
  let cleaned = raw;
  let cover: string | undefined;
  const sectionImages: string[] = [];

  // (cover: URL)
  cleaned = cleaned.replace(/\(cover:\s*(https?:\/\/[^\s)]+)\s*\)/gi, (_m, url) => {
    if (!cover) cover = url;
    return "";
  });

  // (image: URL)
  cleaned = cleaned.replace(/\(image:\s*(https?:\/\/[^\s)]+)\s*\)/gi, (_m, url) => {
    sectionImages.push(url);
    return "";
  });

  // ![alt](URL)
  cleaned = cleaned.replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, (_m, url) => {
    sectionImages.push(url);
    return "";
  });

  // Bare image URLs
  cleaned = cleaned.replace(/(^|\s)(https?:\/\/[^\s]+)/g, (whole, sp, url) => {
    if (IMG_EXT.test(url)) {
      sectionImages.push(url);
      return sp;
    }
    return whole;
  });

  return { cleaned: cleaned.trim(), cover, sectionImages };
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // Guard against absurdly large images
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

export const analyzeNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<StructuredDocument> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { cleaned, cover, sectionImages } = extractImages(data.notes);

    const tool = {
      type: "function" as const,
      function: {
        name: "emit_document",
        description: "Emit the structured educational document.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            category: { type: "string" },
            executiveSummary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  intro: { type: "string" },
                  paragraphs: { type: "array", items: { type: "string" } },
                  callouts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["important", "historical", "insight", "warning", "definition", "quote"],
                        },
                        title: { type: "string" },
                        body: { type: "string" },
                      },
                      required: ["type", "body"],
                      additionalProperties: false,
                    },
                  },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["date", "title"],
                      additionalProperties: false,
                    },
                  },
                  table: {
                    type: "object",
                    properties: {
                      caption: { type: "string" },
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                    },
                    required: ["headers", "rows"],
                    additionalProperties: false,
                  },
                  takeaways: { type: "array", items: { type: "string" } },
                },
                required: ["heading", "paragraphs"],
                additionalProperties: false,
              },
            },
            finalSummary: { type: "string" },
            references: { type: "array", items: { type: "string" } },
          },
          required: ["title", "subtitle", "category", "executiveSummary", "sections", "finalSummary"],
          additionalProperties: false,
        },
      },
    };

    const aiPromise = fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Organize these notes into a structured document. PRESERVE all wording verbatim — only group, label, and lay out.\n\nNOTES:\n\n${cleaned}`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_document" } },
      }),
    });

    // Fetch images in parallel with AI call
    const allUrls = [cover, ...sectionImages].filter(Boolean) as string[];
    const imagePromise = Promise.all(allUrls.map(fetchAsDataUrl));

    const [res, imageData] = await Promise.all([aiPromise, imagePromise]);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
      throw new Error(`AI gateway error ${res.status}: ${txt}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("Model returned no structured document.");
    const docOut = JSON.parse(call.function.arguments) as StructuredDocument;

    // Map fetched images
    let idx = 0;
    let coverImage: string | null = null;
    if (cover) {
      coverImage = imageData[idx] ?? null;
      idx++;
    }
    const fetchedSectionImages = imageData.slice(idx).filter((v): v is string => !!v);

    // Distribute section images sequentially across sections
    docOut.sections.forEach((sec, i) => {
      if (fetchedSectionImages[i]) sec.image = fetchedSectionImages[i];
    });
    // If we have extra section images beyond sections count, append into last section
    if (fetchedSectionImages.length > docOut.sections.length && docOut.sections.length > 0) {
      // ignore extras silently
    }

    // If no explicit cover but section images exist, promote first to cover
    if (!coverImage && fetchedSectionImages.length > 0) {
      coverImage = fetchedSectionImages[0];
    }

    docOut.coverImage = coverImage;
    return docOut;
  });
