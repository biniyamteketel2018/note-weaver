import { createElement } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import type { StructuredDocument } from "@/lib/analyze.functions";

const A4_W_MM = 210;
const A4_H_MM = 297;
const EXPORT_W = 794; // A4 width @ 96dpi
const EXPORT_H = Math.round((EXPORT_W * A4_H_MM) / A4_W_MM); // ~1123

function nextPaint() {
  return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function waitForFonts() {
  if ("fonts" in document) await (document as any).fonts.ready;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        });
      }
      try {
        await img.decode?.();
      } catch {}
    }),
  );
}

// ---------- color sanitization (html2canvas can't parse oklch/lab/color-mix) ----------
const UNSUPPORTED = /\b(lab|lch|oklab|oklch|color|color-mix)\(/i;
const SIMPLE_FN = /\b(lab|lch|oklab|oklch|color)\(([^()]*)\)/gi;
const cache = new Map<string, string>();

function clamp(n: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, n));
}
function rgb(r: number, g: number, b: number, a = 1) {
  const R = Math.round(clamp(r) * 255);
  const G = Math.round(clamp(g) * 255);
  const B = Math.round(clamp(b) * 255);
  return a < 1 ? `rgba(${R},${G},${B},${clamp(a)})` : `rgb(${R},${G},${B})`;
}
function lin(v: number) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
function oklabToRgb(l: number, a: number, b: number, alpha = 1) {
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgb(
    lin(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1),
    lin(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1),
    lin(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1),
    alpha,
  );
}
function xyzToRgb(x: number, y: number, z: number, alpha = 1) {
  return rgb(
    lin(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    lin(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    lin(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
    alpha,
  );
}
function labToRgb(l: number, a: number, b: number, alpha = 1) {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const inv = (t: number) => (t ** 3 > e ? t ** 3 : (116 * t - 16) / k);
  return xyzToRgb(0.96422 * inv(fx), inv(fy), 0.82521 * inv(fz), alpha);
}
function parts(s: string) {
  return s.replace(/,/g, " ").replace(/\s*\/\s*/g, " / ").trim().split(/\s+/).filter(Boolean);
}
function parseAlpha(t?: string) {
  if (!t) return 1;
  return t.endsWith("%") ? clamp(parseFloat(t) / 100) : clamp(parseFloat(t));
}
function parseModern(fn: string, body: string): string | null {
  const p = parts(body);
  const si = p.indexOf("/");
  const vals = si >= 0 ? p.slice(0, si) : p;
  const a = si >= 0 ? parseAlpha(p[si + 1]) : 1;
  const num = (s?: string, pct100 = false) => {
    if (!s) return 0;
    if (s.endsWith("%")) return pct100 ? parseFloat(s) / 100 : parseFloat(s);
    return parseFloat(s);
  };
  if (fn === "oklch" || fn === "oklab") {
    const l = num(vals[0], true);
    const c1 = num(vals[1]);
    const h = num(vals[2]);
    if (fn === "oklch") {
      return oklabToRgb(l, c1 * Math.cos((h * Math.PI) / 180), c1 * Math.sin((h * Math.PI) / 180), a);
    }
    return oklabToRgb(l, c1, num(vals[2]), a);
  }
  if (fn === "lab" || fn === "lch") {
    const l = num(vals[0]);
    const c1 = num(vals[1]);
    const h = num(vals[2]);
    if (fn === "lch") {
      return labToRgb(l, c1 * Math.cos((h * Math.PI) / 180), c1 * Math.sin((h * Math.PI) / 180), a);
    }
    return labToRgb(l, c1, num(vals[2]), a);
  }
  if (fn === "color") {
    const ns = vals.slice(1).map((v) => parseFloat(v));
    if (ns.length >= 3) return rgb(ns[0], ns[1], ns[2], a);
  }
  return null;
}
function sanitizeStr(v: string, fallback: string) {
  if (!v) return v;
  const key = fallback + "|" + v;
  const c = cache.get(key);
  if (c) return c;
  let out = v.replace(SIMPLE_FN, (_m, fn, body) => parseModern(fn.toLowerCase(), body) ?? fallback);
  if (UNSUPPORTED.test(out)) out = fallback;
  cache.set(key, out);
  return out;
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
const COMPLEX_PROPS = ["background", "background-image", "box-shadow", "text-shadow", "border-image-source"];

function sanitizeColors(root: HTMLElement) {
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of all) {
    el.style.colorScheme = "light";
    const cs = getComputedStyle(el);
    for (const p of COLOR_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v && UNSUPPORTED.test(v)) {
        el.style.setProperty(p, sanitizeStr(v, p === "background-color" ? "transparent" : "#1f2433"), "important");
      }
    }
    for (const p of COMPLEX_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v && (UNSUPPORTED.test(v) || /\bin\s+(oklab|lab|oklch|lch)\b/i.test(v))) {
        if (p === "background" || p === "background-image") {
          el.style.setProperty("background-image", "none", "important");
          el.style.setProperty(
            "background-color",
            sanitizeStr(cs.backgroundColor, "transparent"),
            "important",
          );
        } else {
          el.style.setProperty(p, sanitizeStr(v, "none"), "important");
        }
      }
    }
  }
}

function forceSafePageColors(doc: Document) {
  const prev = {
    a: doc.documentElement.style.backgroundColor,
    b: doc.documentElement.style.color,
    c: doc.body.style.backgroundColor,
    d: doc.body.style.color,
  };
  doc.documentElement.style.backgroundColor = "#ffffff";
  doc.documentElement.style.color = "#1f2433";
  doc.body.style.backgroundColor = "#ffffff";
  doc.body.style.color = "#1f2433";
  return () => {
    doc.documentElement.style.backgroundColor = prev.a;
    doc.documentElement.style.color = prev.b;
    doc.body.style.backgroundColor = prev.c;
    doc.body.style.color = prev.d;
  };
}

// Push elements that would straddle a page boundary down to the next page.
function nudgeKeepBlocks(article: HTMLElement) {
  const articleTop = article.getBoundingClientRect().top;
  const keeps = Array.from(article.querySelectorAll<HTMLElement>("[data-pdf-keep]"));
  for (const el of keeps) {
    // Skip nested keeps (only handle outermost)
    if (el.parentElement?.closest("[data-pdf-keep]")) continue;
    const rect = el.getBoundingClientRect();
    const top = rect.top - articleTop;
    const h = rect.height;
    if (h < 40 || h > EXPORT_H - 40) continue;
    const offset = ((top % EXPORT_H) + EXPORT_H) % EXPORT_H;
    if (offset + h > EXPORT_H - 12 && offset > 12) {
      const spacer = document.createElement("div");
      spacer.style.height = `${Math.ceil(EXPORT_H - offset)}px`;
      el.parentElement?.insertBefore(spacer, el);
    }
  }
}

export async function exportPreviewToPdf(opts: {
  doc: StructuredDocument;
  coverImage?: string | null;
  filename: string;
}) {
  const [{ default: html2canvas }, { jsPDF }, { createRoot }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
    import("react-dom/client"),
  ]);

  const host = document.createElement("div");
  host.className = "pdf-export-host";
  const inner = document.createElement("div");
  inner.className = "pdf-export";
  inner.style.width = `${EXPORT_W}px`;
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

  const restore = forceSafePageColors(document);

  try {
    await nextPaint();
    await waitForFonts();
    await waitForImages(inner);
    await nextPaint();

    const article = inner.querySelector<HTMLElement>("article");
    if (!article) throw new Error("Preview not rendered");

    nudgeKeepBlocks(article);
    await nextPaint();
    sanitizeColors(article);

    const totalH = Math.ceil(article.getBoundingClientRect().height);
    // Clamp scale to stay under canvas pixel limits (~16384px height max).
    const maxScale = Math.max(1, Math.min(2, 15000 / totalH));
    const scale = maxScale;

    const canvas = await html2canvas(article, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: EXPORT_W,
      height: totalH,
      windowWidth: EXPORT_W,
      windowHeight: totalH,
      logging: false,
      imageTimeout: 20000,
      onclone: (cdoc, cel) => {
        forceSafePageColors(cdoc);
        sanitizeColors(cel as HTMLElement);
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pagePxH = Math.floor(EXPORT_H * scale);
    const totalPx = canvas.height;
    const pageCount = Math.max(1, Math.ceil(totalPx / pagePxH));

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = pagePxH;
    const ctx = sliceCanvas.getContext("2d")!;

    for (let i = 0; i < pageCount; i++) {
      const srcY = i * pagePxH;
      const sliceH = Math.min(pagePxH, totalPx - srcY);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const data = sliceCanvas.toDataURL("image/jpeg", 0.9);
      if (i > 0) pdf.addPage();
      // Render slice at full A4 width; height proportional to slice
      const renderH = (sliceH / pagePxH) * A4_H_MM;
      pdf.addImage(data, "JPEG", 0, 0, A4_W_MM, renderH);
    }

    pdf.save(opts.filename);
  } finally {
    restore();
    root.unmount();
    host.remove();
  }
}
