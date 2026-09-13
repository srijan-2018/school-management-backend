import PDFDocument from "pdfkit";
import {
  applyPdfUnicodeFont,
  assertPdfFontAvailable,
  detectPdfScript,
  detectPdfScriptFromValues,
  ensurePdfFontsInstalled,
  writePdfText,
} from "../src/utils/pdf-fonts";

async function main() {
  await ensurePdfFontsInstalled();

  const mockTest = {
    title: "Sidhori Class 10 Bengali Mock Test",
    className: "Sidhori cl 10",
    subjectName: "BENGALI",
    level: "easy",
    status: "evaluated",
    negativeMarkingEnabled: false,
    aiSuggestion: "Revise ব্যাকরণ chapters.",
    result: {
      score: 0,
      totalQuestions: 10,
      correctCount: 0,
      wrongCount: 10,
      unansweredCount: 0,
      percentage: 0,
      questions: [{ selectedAnswer: "A", isCorrect: false }],
    },
    questions: [
      {
        question: "'আকাশ' শব্দের অর্থ কী?",
        options: [
          { key: "A", text: "Sky" },
          { key: "B", text: "পৃথিবী" },
          { key: "C", text: "Water" },
          { key: "D", text: "Fire" },
        ],
        correctAnswer: "A",
        explanation: "আকাশ মানে sky.",
      },
    ],
  };

  const scriptSamples: unknown[] = [
    mockTest.title,
    mockTest.subjectName,
    ...mockTest.questions.flatMap((q) => [
      q.question,
      q.explanation,
      ...q.options.map((o) => o.text),
    ]),
  ];
  const documentScript = detectPdfScriptFromValues(scriptSamples);
  assertPdfFontAvailable(documentScript);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (c) => chunks.push(c));

  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);

    const writeLine = (text: string, style?: "regular" | "bold") => {
      writePdfText(doc, text, {
        script: detectPdfScript(text),
        style,
        size: 11,
      });
    };

    applyPdfUnicodeFont(doc, { script: documentScript, size: 11 });
    writeLine(mockTest.title, "bold");
    doc.moveDown();
    writeLine(`Subject: ${mockTest.subjectName}`);
    writeLine("Questions", "bold");
    doc.moveDown();
    const q = mockTest.questions[0];
    writeLine(`1. ${q.question}`, "bold");
    for (const opt of q.options) {
      writeLine(`${opt.key}. ${opt.text}`);
    }
    writeLine(`Explanation: ${q.explanation}`);
    doc.end();
  });

  console.log("OK bytes:", Buffer.concat(chunks).length, "script:", documentScript);
}

main().catch((error) => {
  console.error("PDF test failed:", error);
  process.exit(1);
});
