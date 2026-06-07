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
};

export type StructuredDocument = {
  title: string;
  subtitle: string;
  category: string; // history | business | science | technology | philosophy | etc.
  heroPrompt: string; // prompt for cover image
  executiveSummary: string;
  sections: Section[];
  finalSummary: string;
  references?: string[];
};

const SYSTEM_PROMPT = `You are a world-class editorial designer and educational writer.
Your job: transform raw, messy notes into a premium, magazine-quality educational document spec.

Rules:
- Extract a compelling title and subtitle.
- Detect the dominant category (history, business, science, technology, philosophy, religion, economics, politics, research, education, general).
- Write a 2-4 sentence executive summary in elegant prose.
- Break content into 3-7 logical sections with clear, evocative headings.
- For each section: write 2-5 well-crafted paragraphs (do NOT just copy the notes verbatim — restructure, clarify, enrich with context).
- Add callouts where appropriate (definitions, key insights, historical context, important warnings, notable quotes).
- If chronological events appear, build a timeline with 3-8 items.
- If comparisons appear, build a comparison table.
- End each section with 2-4 key takeaways.
- Write a final summary tying everything together.
- Provide a heroPrompt: a single descriptive sentence for generating a cover image (photographic or illustrative, no text).
- Output ONLY the JSON matching the tool schema. No prose.`;

export const analyzeNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<StructuredDocument> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

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
            heroPrompt: { type: "string" },
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
                      rows: {
                        type: "array",
                        items: { type: "array", items: { type: "string" } },
                      },
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
          required: [
            "title",
            "subtitle",
            "category",
            "heroPrompt",
            "executiveSummary",
            "sections",
            "finalSummary",
          ],
          additionalProperties: false,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Raw notes to transform:\n\n${data.notes}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_document" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
      throw new Error(`AI gateway error ${res.status}: ${txt}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("Model returned no structured document.");
    return JSON.parse(call.function.arguments) as StructuredDocument;
  });
