import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import type { StructuredDocument } from "@/lib/analyze.functions";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const EXPORT_WIDTH_PX = 794;
const EXPORT_HEIGHT_PX = Math.round((EXPORT_WIDTH_PX * A4_HEIGHT_MM) / A4_WIDTH_MM);

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function waitForFonts() {
  if ("fonts" in document) {
    await document.fonts.ready;
  }
}

async function waitForImages(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      }
      if (img.decode) {
        await img.decode().catch(() => undefined);
      }
    }),
  );
}

function addSpacerBefore(element: HTMLElement, height: number) {
  if (height < 4) return;
  const spacer = document.createElement("div");
  spacer.setAttribute("data-pdf-spacer", "true");
  spacer.style.height = `${Math.ceil(height)}px`;
  spacer.style.breakInside = "avoid";
  spacer.style.pageBreakInside = "avoid";
  element.parentElement?.insertBefore(spacer, element);
}

// ---- Color sanitization (html2canvas can't parse lab()/oklch()/color()) ----
const colorConvertCanvas = document.createElement("canvas");
const colorConvertCtx = colorConvertCanvas.getContext("2d")!;
const colorCache = new Map<string, string>();

function convertColor(value: string): string {
  const cached = colorCache.get(value);
  if (cached) return cached;
  try {
    colorConvertCtx.fillStyle = "#000";
    colorConvertCtx.fillStyle = value;
    const out = colorConvertCtx.fillStyle as string;
    colorCache.set(value, out);
    return out;
  } catch {
    colorCache.set(value, value);
    return value;
  }
}

const UNSUPPORTED_FN_RE = /(lab|lch|oklab|oklch|color)\(\s*[^()]*(?:\([^()]*\)[^()]*)*\)/gi;

function sanitizeColorString(value: string): string {
  if (!value) return value;
  if (!UNSUPPORTED_FN_RE.test(value)) return value;
  UNSUPPORTED_FN_RE.lastIndex = 0;
  return value.replace(UNSUPPORTED_FN_RE, (match) => convertColor(match));
}

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
  "caret-color",
  "column-rule-color",
];

const COMPLEX_PROPS = ["background", "background-image", "box-shadow", "border-image-source", "text-shadow"];

function sanitizeColors(root: HTMLElement) {
  const all: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of all) {
    const cs = getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (!v) continue;
      if (/lab\(|lch\(|oklab\(|oklch\(|color\(/i.test(v)) {
        el.style.setProperty(prop, convertColor(v));
      }
    }
    for (const prop of COMPLEX_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (!v) continue;
      if (/lab\(|lch\(|oklab\(|oklch\(|color\(/i.test(v)) {
        el.style.setProperty(prop, sanitizeColorString(v));
      }
    }
  }
}

function preparePageBreaks(article: HTMLElement) {
  const avoidSelector = [
    "[data-pdf-keep]",
    "blockquote",
    "aside",
    "figure",
    "img",
    "table",
    "tr",
    "h1",
    "h2",
    "h3",
    "p",
    "li",
  ].join(",");

  const candidates = Array.from(
    article.querySelectorAll<HTMLElement>(`[data-pdf-break="before"], ${avoidSelector}`),
  ).filter((element) => {
    if (element.hasAttribute("data-pdf-spacer")) return false;
    const closestKeep = element.closest<HTMLElement>("[data-pdf-keep]");
    return !closestKeep || closestKeep === element;
  });

  for (const element of candidates) {
    const articleTop = article.getBoundingClientRect().top;
    const rect = element.getBoundingClientRect();
    const top = rect.top - articleTop;
    const height = rect.height;
    if (height < 1) continue;

    const pageOffset = ((top % EXPORT_HEIGHT_PX) + EXPORT_HEIGHT_PX) % EXPORT_HEIGHT_PX;
    const distanceToNextPage = EXPORT_HEIGHT_PX - pageOffset;
    const isAtPageTop = pageOffset < 2 || distanceToNextPage < 2;
    const forcedBreak = element.getAttribute("data-pdf-break") === "before";

    if (forcedBreak && top > 2 && !isAtPageTop) {
      addSpacerBefore(element, distanceToNextPage);
      continue;
    }

    const shouldStayTogether = element.matches(avoidSelector);
    const wouldSplit = pageOffset + height > EXPORT_HEIGHT_PX - 16;
    const canFitOnFreshPage = height < EXPORT_HEIGHT_PX - 32;

    if (shouldStayTogether && wouldSplit && canFitOnFreshPage && !isAtPageTop) {
      addSpacerBefore(element, distanceToNextPage);
    }
  }
}

export async function exportPreviewToPdf(opts: {
  doc: StructuredDocument;
  coverImage?: string | null;
  filename: string;
}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  host.className = "pdf-export-host";
  const inner = document.createElement("div");
  inner.className = "pdf-export";
  const pageHost = document.createElement("div");
  pageHost.className = "pdf-page-host";
  host.appendChild(inner);
  host.appendChild(pageHost);
  document.body.appendChild(host);

  const root = createRoot(inner);
  root.render(
    createElement(DocumentPreview, {
      doc: opts.doc,
      coverImage: opts.coverImage,
      forExport: true,
    }),
  );

  try {
    await nextPaint();
    await waitForFonts();
    await waitForImages(inner);
    await nextPaint();

    const article = inner.querySelector<HTMLElement>("article");
    if (!article) throw new Error("PDF export failed: preview was not rendered.");

    preparePageBreaks(article);
    await nextPaint();

    const totalHeight = Math.ceil(article.getBoundingClientRect().height);
    const pageCount = Math.max(1, Math.ceil(totalHeight / EXPORT_HEIGHT_PX));
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = document.createElement("div");
      page.className = "pdf-capture-page";
      page.style.width = `${EXPORT_WIDTH_PX}px`;
      page.style.height = `${EXPORT_HEIGHT_PX}px`;

      const clone = article.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "0";
      clone.style.top = `-${pageIndex * EXPORT_HEIGHT_PX}px`;
      clone.style.width = `${EXPORT_WIDTH_PX}px`;
      clone.style.maxWidth = "none";
      clone.style.boxShadow = "none";
      page.appendChild(clone);
      pageHost.appendChild(page);
      await nextPaint();
      await waitForImages(page);
      sanitizeColors(page);

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: EXPORT_WIDTH_PX,
        height: EXPORT_HEIGHT_PX,
        windowWidth: EXPORT_WIDTH_PX,
        windowHeight: EXPORT_HEIGHT_PX,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 20000,
      });

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      page.remove();
    }

    pdf.save(opts.filename);
  } finally {
    root.unmount();
    host.remove();
  }
}
