import fs from "fs";
import https from "https";
import os from "os";
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
const FONT_CACHE_DIR = path.join(os.tmpdir(), "school-management-pdf-fonts");
let resolvedFontsRoot: string | null = null;
let fontsInstallPromise: Promise<void> | null = null;

function listFontRootCandidates() {
  return [
    path.resolve(__dirname, "../assets/fonts"),
    path.resolve(__dirname, "../../assets/fonts"),
    path.resolve(process.cwd(), "dist/assets/fonts"),
    path.resolve(process.cwd(), "assets/fonts"),
    path.resolve(process.cwd(), "school-management-backend/assets/fonts"),
    FONT_CACHE_DIR,
  ];
}

function directoryHasFont(fileName: string, directory: string) {
  return fs.existsSync(path.join(directory, fileName));
}

function findBundledFontsRoot() {
  for (const candidate of listFontRootCandidates()) {
    if (directoryHasFont(FONT_FILES.bengali.regular, candidate)) {
      return candidate;
    }
  }
  return null;
}

function copyMissingFonts(sourceDir: string, targetDir: string) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const fileName of Object.keys(FONT_DOWNLOAD_URLS)) {
    const sourcePath = path.join(sourceDir, fileName);
    const targetPath = path.join(targetDir, fileName);
    if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function resolveFontsRoot() {
  if (resolvedFontsRoot) {
    return resolvedFontsRoot;
  }

  for (const candidate of listFontRootCandidates()) {
    const bengaliRegular = path.join(candidate, FONT_FILES.bengali.regular);
    const latinRegular = path.join(candidate, FONT_FILES.latin.regular);
    if (fs.existsSync(bengaliRegular) || fs.existsSync(latinRegular)) {
      resolvedFontsRoot = candidate;
      return candidate;
    }
  }

  resolvedFontsRoot = FONT_CACHE_DIR;
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
    resolvedFontsRoot = null;

    const bundledRoot = findBundledFontsRoot();
    const installRoot = bundledRoot ?? FONT_CACHE_DIR;
    fs.mkdirSync(installRoot, { recursive: true });

    if (!bundledRoot) {
      for (const candidate of listFontRootCandidates()) {
        if (candidate === FONT_CACHE_DIR) {
          continue;
        }
        copyMissingFonts(candidate, FONT_CACHE_DIR);
      }
    }

    for (const [fileName, url] of Object.entries(FONT_DOWNLOAD_URLS)) {
      const destination = path.join(installRoot, fileName);
      if (fs.existsSync(destination)) {
        continue;
      }
      try {
        await downloadFile(url, destination);
      } catch (error) {
        console.error(`[pdf-fonts] Failed to download ${fileName}:`, error);
      }
    }

    resolvedFontsRoot = directoryHasFont(
      FONT_FILES.bengali.regular,
      installRoot,
    )
      ? installRoot
      : findBundledFontsRoot() ?? FONT_CACHE_DIR;
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

export function resolvePdfScriptForLine(
  text: string,
  documentScript: keyof typeof FONT_FILES = "latin",
): keyof typeof FONT_FILES {
  const detected = detectPdfScript(text);
  if (documentScript === "bengali" || documentScript === "devanagari") {
    return documentScript;
  }
  return detected;
}

const PDF_TEXT_RUN_PATTERN =
  /[\u0980-\u09FF]+|[\u0900-\u097F]+|[^\u0980-\u09FF\u0900-\u097F]+/g;

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

/** Renders mixed Latin + Indic on one line with per-run fonts (avoids tofu boxes). */
export function writePdfTextMixed(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  options?: PDFKit.Mixins.TextOptions & {
    documentScript?: keyof typeof FONT_FILES;
    style?: PdfFontStyle;
    size?: number;
  },
) {
  const { documentScript = "latin", style, size, align, underline, ...rest } =
    options ?? {};
  const runs = text.match(PDF_TEXT_RUN_PATTERN)?.filter((run) => run.length > 0);

  if (!runs || runs.length <= 1) {
    writePdfText(doc, text, {
      ...rest,
      align,
      underline,
      style,
      size,
      script: resolvePdfScriptForLine(text, documentScript),
    });
    return;
  }

  runs.forEach((run, index) => {
    const isLast = index === runs.length - 1;
    writePdfText(doc, run, {
      ...rest,
      align: isLast ? align : undefined,
      underline: isLast ? underline : false,
      style,
      size,
      script: resolvePdfScriptForLine(run, documentScript),
      continued: !isLast,
    });
  });
}

export function writePdfLabelValueLine(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  options?: {
    documentScript?: keyof typeof FONT_FILES;
    style?: PdfFontStyle;
    size?: number;
  },
) {
  const documentScript = options?.documentScript ?? "latin";
  const style = options?.style ?? "regular";
  const size = options?.size ?? 11;
  const labelScript = resolvePdfScriptForLine(label, documentScript);
  const valueScript = resolvePdfScriptForLine(value, documentScript);

  writePdfText(doc, `${label}: `, {
    script: labelScript,
    style,
    size,
    continued: true,
  });
  writePdfText(doc, value, {
    script: valueScript,
    style,
    size,
    continued: false,
  });
}
