import fs from "fs";
import https from "https";
import path from "path";
import type PDFDocument from "pdfkit";

export type PdfFontStyle = "regular" | "bold";

type PdfFontSet = {
  regular: string;
  bold: string;
};

const FONT_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf";

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
    bold: "NotoSansDevanagari-Regular.ttf",
  },
} as const;

const FONT_DOWNLOAD_URLS: Record<string, string> = {
  [FONT_FILES.latin.regular]: `${FONT_CDN_BASE}/NotoSans/NotoSans-Regular.ttf`,
  [FONT_FILES.latin.bold]: `${FONT_CDN_BASE}/NotoSans/NotoSans-Bold.ttf`,
  [FONT_FILES.bengali.regular]: `${FONT_CDN_BASE}/NotoSansBengali/NotoSansBengali-Regular.ttf`,
  [FONT_FILES.bengali.bold]: `${FONT_CDN_BASE}/NotoSansBengali/NotoSansBengali-Bold.ttf`,
  [FONT_FILES.devanagari.regular]: `${FONT_CDN_BASE}/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf`,
};

const registeredDocs = new WeakMap<object, Set<string>>();
let resolvedFontsRoot: string | null = null;
let fontsInstallPromise: Promise<void> | null = null;

function resolveFontsRoot() {
  if (resolvedFontsRoot) {
    return resolvedFontsRoot;
  }

  const candidates = [
    // Compiled output: dist/utils -> dist/assets/fonts (copied at build time).
    path.resolve(__dirname, "../assets/fonts"),
    path.resolve(__dirname, "../../assets/fonts"),
    path.resolve(process.cwd(), "dist/assets/fonts"),
    path.resolve(process.cwd(), "assets/fonts"),
    path.resolve(process.cwd(), "school-management-backend/assets/fonts"),
  ];

  for (const candidate of candidates) {
    const bengaliRegular = path.join(candidate, FONT_FILES.bengali.regular);
    const latinRegular = path.join(candidate, FONT_FILES.latin.regular);
    if (fs.existsSync(bengaliRegular) || fs.existsSync(latinRegular)) {
      resolvedFontsRoot = candidate;
      return candidate;
    }
  }

  resolvedFontsRoot = path.resolve(__dirname, "../assets/fonts");
  return resolvedFontsRoot;
}

function resolveFontPath(fileName: string) {
  return path.join(resolveFontsRoot(), fileName);
}

function fontExists(fileName: string) {
  try {
    return fs.existsSync(resolveFontPath(fileName));
  } catch {
    return false;
  }
}

function downloadFile(url: string, destination: string) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlink(destination, () => undefined);
          downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (!response.statusCode || response.statusCode >= 400) {
          file.close();
          fs.unlink(destination, () => undefined);
          reject(
            new Error(
              `Failed to download font (${response.statusCode ?? "unknown"}): ${url}`,
            ),
          );
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (error) => {
        file.close();
        fs.unlink(destination, () => undefined);
        reject(error);
      });
  });
}

export async function ensurePdfFontsInstalled() {
  if (fontsInstallPromise) {
    return fontsInstallPromise;
  }

  fontsInstallPromise = (async () => {
    const root = resolveFontsRoot();
    fs.mkdirSync(root, { recursive: true });

    for (const [fileName, url] of Object.entries(FONT_DOWNLOAD_URLS)) {
      const destination = path.join(root, fileName);
      if (fs.existsSync(destination)) {
        continue;
      }
      await downloadFile(url, destination);
    }
  })();

  try {
    await fontsInstallPromise;
  } catch (error) {
    fontsInstallPromise = null;
    throw error;
  }
}

export function assertPdfFontAvailable(script: keyof typeof FONT_FILES) {
  const files = FONT_FILES[script];
  if (!fontExists(files.regular)) {
    throw new Error(
      `PDF font missing for ${script} script (${files.regular}). Run: npm run fonts:pdf`,
    );
  }
}

export function detectPdfScript(value: string): keyof typeof FONT_FILES {
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
    const lowered = text.toLowerCase();
    if (
      /\bbengali\b|\bbangla\b|\bbangali\b|বাংলা/.test(lowered) ||
      lowered.includes("beng")
    ) {
      hasBengali = true;
    }
    if (/\bhindi\b|\bdevanagari\b/.test(lowered)) {
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
    (fontExists(latin.bold) ? resolveFontPath(latin.bold) : regular);

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

function pickFontPath(
  script: keyof typeof FONT_FILES,
  style: PdfFontStyle,
) {
  const fonts = getFontSet(script);
  const primary = style === "bold" ? fonts.bold : fonts.regular;
  if (primary) {
    return primary;
  }
  if (style === "bold" && fonts.regular) {
    return fonts.regular;
  }
  return "";
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
  const fontPath = pickFontPath(script, style);
  const fontName = `MockTest-${script}-${style}`;

  if (!fontPath) {
    if (script !== "latin") {
      throw new Error(
        `PDF font files for ${script} are not installed on the server. Run npm run build on the backend.`,
      );
    }
    doc.font(style === "bold" ? "Helvetica-Bold" : "Helvetica");
  } else if (!ensureFontRegistered(doc, fontName, fontPath)) {
    if (script !== "latin") {
      throw new Error(`Failed to register PDF font for ${script}.`);
    }
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
  const resolvedScript = script ?? detectPdfScript(text);
  applyPdfUnicodeFont(doc, {
    script: resolvedScript,
    style,
    size,
  });
  doc.text(text, textOptions);
}
