const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "fonts");
const targetDir = path.join(root, "dist", "assets", "fonts");

if (!fs.existsSync(sourceDir)) {
  console.warn(
    `[copy-pdf-fonts] Skip: source missing (${sourceDir}). Run npm run fonts:pdf first.`,
  );
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

let copied = 0;
for (const fileName of fs.readdirSync(sourceDir)) {
  if (!fileName.toLowerCase().endsWith(".ttf")) {
    continue;
  }
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
  copied += 1;
}

console.log(`[copy-pdf-fonts] Copied ${copied} font file(s) to ${targetDir}`);

const required = [
  "NotoSans-Regular.ttf",
  "NotoSansBengali-Regular.ttf",
  "NotoSansBengali-Bold.ttf",
];
const missing = required.filter(
  (fileName) => !fs.existsSync(path.join(targetDir, fileName)),
);
if (missing.length > 0) {
  console.error(
    `[copy-pdf-fonts] Missing required font(s) in dist: ${missing.join(", ")}`,
  );
  process.exit(1);
}
