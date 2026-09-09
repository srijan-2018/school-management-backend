import fs from "fs";
import path from "path";
import type PDFDocument from "pdfkit";

export type PdfFontStyle = "regular" | "bold";

type PdfFontSet = {
  regular: string;
  bold: string;
};

const fontsRoot = path.resolve(__dirname, "../../assets/fonts");

const FONT_FILES = {
  latin: {
    regular: "NotoSans-Regular.ttf",
    bold: "NotoSans-Bold.ttf",
  },
  bengali: {
    regular: "NotoSansBengali-Regular.ttf",
    bold: "NotoSansBengali-Bold.ttf",
  },
  devanagari: {
    regular: "NotoSansDevanagari-Regular.ttf",
    // Devanagari bold may be unavailable; fall back to regular.
    bold: "NotoSansDevanagari-Regular.ttf",
  },
} as const;

const registeredDocs = new WeakMap<object, Set<string>>();

function resolveFontPath(fileName: string) {
  return path.join(fontsRoot, fileName);
}

function fontExists(fileName: string) {
  try {
    return fs.existsSync(resolveFontPath(fileName));
  } catch {
    return false;
  }
}

export function detectPdfScript(
  value: string,
): keyof typeof FONT_FILES {
  if (/[\u0980-\u09FF]/.test(value)) {
    return "bengali";
  }
  if (/[\u0900-\u097F]/.test(value)) {
    return "devanagari";
  }
  return "latin";
}

export function detectPdfScriptFromValues(values: Array<unknown>) {
  let hasBengali = false;
  let hasDevanagari = false;

  for (const value of values) {
    const text = String(value ?? "");
    if (/[\u0980-\u09FF]/.test(text)) {
      hasBengali = true;
    }
    if (/[\u0900-\u097F]/.test(text)) {
      hasDevanagari = true;
    }
  }

  if (hasBengali) {
    return "bengali";
  }
  if (hasDevanagari) {
    return "devanagari";
  }
  return "latin";
}

function getFontSet(script: keyof typeof FONT_FILES): PdfFontSet {
  const files = FONT_FILES[script];
  const latin = FONT_FILES.latin;

  const regular = fontExists(files.regular)
    ? resolveFontPath(files.regular)
    : fontExists(latin.regular)
      ? resolveFontPath(latin.regular)
      : "";
  const boldCandidate = fontExists(files.bold)
    ? resolveFontPath(files.bold)
    : regular;
  const bold =
    boldCandidate ||
    (fontExists(latin.bold)
      ? resolveFontPath(latin.bold)
      : regular);

  return { regular, bold };
}

function ensureFontRegistered(
  doc: InstanceType<typeof PDFDocument>,
  fontName: string,
  fontPath: string,
) {
  if (!fontPath) {
    return false;
  }

  let registered = registeredDocs.get(doc);
  if (!registered) {
    registered = new Set();
    registeredDocs.set(doc, registered);
  }

  if (!registered.has(fontName)) {
    doc.registerFont(fontName, fontPath);
    registered.add(fontName);
  }

  return true;
}

export function applyPdfUnicodeFont(
  doc: InstanceType<typeof PDFDocument>,
  options?: {
    script?: keyof typeof FONT_FILES;
    style?: PdfFontStyle;
    size?: number;
  },
) {
  const script = options?.script ?? "latin";
  const style = options?.style ?? "regular";
  const fonts = getFontSet(script);
  const fontPath = style === "bold" ? fonts.bold : fonts.regular;
  const fontName = `MockTest-${script}-${style}`;

  if (!ensureFontRegistered(doc, fontName, fontPath)) {
    // Last resort: built-in Helvetica (Latin only).
    doc.font(style === "bold" ? "Helvetica-Bold" : "Helvetica");
  } else {
    doc.font(fontName);
  }

  if (typeof options?.size === "number") {
    doc.fontSize(options.size);
  }
}

export function writePdfText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  options?: PDFKit.Mixins.TextOptions & {
    script?: keyof typeof FONT_FILES;
    style?: PdfFontStyle;
    size?: number;
  },
) {
  const { script, style, size, ...textOptions } = options ?? {};
  applyPdfUnicodeFont(doc, {
    script: script ?? detectPdfScript(text),
    style,
    size,
  });
  doc.text(text, textOptions);
}
