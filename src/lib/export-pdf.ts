import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import type { StructuredDocument } from "@/lib/analyze.functions";

export async function exportPreviewToPdf(opts: {
  doc: StructuredDocument;
  coverImage?: string | null;
  filename: string;
}) {
  const { default: html2pdf } = await import("html2pdf.js");

  // Off-screen host
  const host = document.createElement("div");
  host.className = "pdf-export-host";
  const inner = document.createElement("div");
  inner.className = "pdf-export";
  host.appendChild(inner);
  document.body.appendChild(host);

  const root = createRoot(inner);
  root.render(
    createElement(DocumentPreview, {
      doc: opts.doc,
      coverImage: opts.coverImage,
      forExport: true,
    }),
  );

  // Wait for layout + images to load
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const imgs = Array.from(inner.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: opts.filename,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          imageTimeout: 15000,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(inner)
      .save();
  } finally {
    root.unmount();
    host.remove();
  }
}
