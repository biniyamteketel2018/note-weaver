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

// ---- Color sanitization (html2canvas can't parse lab()/oklch()/color-mix()) ----
const colorCache = new Map<string, string>();
const UNSUPPORTED_COLOR_RE = /\b(lab|lch|oklab|oklch|color|color-mix)\(/i;
const SIMPLE_COLOR_FN_RE = /\b(lab|lch|oklab|oklch|color)\(([^()]*)\)/gi;

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function rgbString(r: number, g: number, b: number, a = 1) {
  const rr = Math.round(clamp(r) * 255);
  const gg = Math.round(clamp(g) * 255);
  const bb = Math.round(clamp(b) * 255);
  return a < 1 ? `rgba(${rr}, ${gg}, ${bb}, ${clamp(a)})` : `rgb(${rr}, ${gg}, ${bb})`;
}

function parseAlpha(token?: string) {
  if (!token) return 1;
  return token.endsWith("%") ? clamp(Number.parseFloat(token) / 100) : clamp(Number.parseFloat(token));
}

function parseHue(token = "0") {
  const n = Number.parseFloat(token);
  if (token.endsWith("turn")) return n * 360;
  if (token.endsWith("rad")) return (n * 180) / Math.PI;
  if (token.endsWith("grad")) return n * 0.9;
  return n;
}

function colorParts(body: string) {
  return body.replace(/,/g, " ").replace(/\s*\/\s*/g, " / ").trim().split(/\s+/).filter(Boolean);
}

function linearToSrgb(v: number) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function xyzD50ToSrgb(x: number, y: number, z: number, alpha = 1) {
  const d65x = 0.9555766 * x - 0.0230393 * y + 0.0631636 * z;
  const d65y = -0.0282895 * x + 1.0099416 * y + 0.0210077 * z;
  const d65z = 0.0122982 * x - 0.020483 * y + 1.3299098 * z;
  const r = linearToSrgb(3.2404542 * d65x - 1.5371385 * d65y - 0.4985314 * d65z);
  const g = linearToSrgb(-0.969266 * d65x + 1.8760108 * d65y + 0.041556 * d65z);
  const b = linearToSrgb(0.0556434 * d65x - 0.2040259 * d65y + 1.0572252 * d65z);
  return rgbString(r, g, b, alpha);
}

function labToRgb(l: number, a: number, b: number, alpha = 1) {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const fInv = (t: number) => {
    const t3 = t ** 3;
    return t3 > epsilon ? t3 : (116 * t - 16) / kappa;
  };
  return xyzD50ToSrgb(0.96422 * fInv(fx), 1 * fInv(fy), 0.82521 * fInv(fz), alpha);
}

function oklabToRgb(l: number, a: number, b: number, alpha = 1) {
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = linearToSrgb(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1);
  const g = linearToSrgb(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1);
  const blue = linearToSrgb(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1);
  return rgbString(r, g, blue, alpha);
}

function parseModernColor(fn: string, body: string): string | null {
  const parts = colorParts(body);
  const slash = parts.indexOf("/");
  const values = slash >= 0 ? parts.slice(0, slash) : parts;
  const alpha = slash >= 0 ? parseAlpha(parts[slash + 1]) : 1;
  if (fn === "lab" || fn === "lch") {
    const l = values[0]?.endsWith("%") ? Number.parseFloat(values[0]) : Number.parseFloat(values[0] ?? "0");
    const c1 = Number.parseFloat(values[1] ?? "0");
    const c2 = fn === "lch" ? parseHue(values[2]) : Number.parseFloat(values[2] ?? "0");
    if (![l, c1, c2, alpha].every(Number.isFinite)) return null;
    if (fn === "lch") return labToRgb(l, c1 * Math.cos((c2 * Math.PI) / 180), c1 * Math.sin((c2 * Math.PI) / 180), alpha);
    return labToRgb(l, c1, c2, alpha);
  }
  if (fn === "oklab" || fn === "oklch") {
    const l = values[0]?.endsWith("%") ? Number.parseFloat(values[0]) / 100 : Number.parseFloat(values[0] ?? "0");
    const c1 = Number.parseFloat(values[1] ?? "0");
    const c2 = fn === "oklch" ? parseHue(values[2]) : Number.parseFloat(values[2] ?? "0");
    if (![l, c1, c2, alpha].every(Number.isFinite)) return null;
    if (fn === "oklch") return oklabToRgb(l, c1 * Math.cos((c2 * Math.PI) / 180), c1 * Math.sin((c2 * Math.PI) / 180), alpha);
    return oklabToRgb(l, c1, c2, alpha);
  }
  if (fn === "color") {
    const nums = values.slice(1).map((v) => Number.parseFloat(v));
    if (nums.length >= 3 && nums.slice(0, 3).every(Number.isFinite)) return rgbString(nums[0], nums[1], nums[2], alpha);
  }
  return null;
}

function canvasConvert(value: string, doc: Document): string | null {
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value;
    const out = String(ctx.fillStyle);
    return UNSUPPORTED_COLOR_RE.test(out) ? null : out;
  } catch {
    return null;
  }
}

function sanitizeColorString(value: string, doc: Document, fallback: string) {
  if (!value) return value;
  const cacheKey = `${fallback}|${value}`;
  const cached = colorCache.get(cacheKey);
  if (cached) return cached;
  let output = value.replace(SIMPLE_COLOR_FN_RE, (_match, fn: string, body: string) => {
    return parseModernColor(fn.toLowerCase(), body) ?? fallback;
  });
  if (UNSUPPORTED_COLOR_RE.test(output)) {
    output = canvasConvert(output, doc) ?? fallback;
  }
  colorCache.set(cacheKey, output);
  return output;
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
