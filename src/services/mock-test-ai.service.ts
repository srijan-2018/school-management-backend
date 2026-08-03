import { AppError } from "../middlewares/error.middleware";

type MockTestLevel = "easy" | "medium" | "hard";

export interface MockOption {
  key: string;
  text: string;
}

export interface MockQuestion {
  question: string;
  options: MockOption[];
  correctAnswer: string;
  explanation: string;
}

export interface GenerateMockTestInput {
  className: string;
  subjectName: string;
  chapterName?: string | null;
  level: MockTestLevel;
  questionCount: number;
}

interface OpenAiResponseOutputText {
  content?: string;
}

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: OpenAiResponseOutputText;
  }>;
}

const wait = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

const getRetryDelayMs = (retryAfterHeader: string | null, attempt: number) => {
  const retryAfterSeconds = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 8000);
  }

  return Math.min(500 * 2 ** (attempt - 1), 8000);
};

const extractJsonObject = (value: string) => {
  const startIndex = value.indexOf("{");
  const endIndex = value.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return value.trim();
  }

  return value.slice(startIndex, endIndex + 1).trim();
};

const normalizeJsonText = (value: string) =>
  value
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();

const optionLabels = ["A", "B", "C", "D"] as const;
const minQuestionLength = 8;
const minOptionTextLength = 1;
const minExplanationLength = 8;

const normalizeOptionText = (value: string) => value.trim();
const normalizeOptionKey = (value: string) => value.trim().toUpperCase();

const normalizeForComparison = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const isLabelOnlyOption = (value: string, index: number) => {
  const normalized = normalizeOptionText(value)
    .replace(/[).:]/g, "")
    .toUpperCase();

  return normalized === optionLabels[index];
};

const hasPlaceholderOptions = (options: MockOption[]) =>
  options.length === 4 &&
  options.every((option, index) => isLabelOnlyOption(option.text, index));

const isWeakOptionText = (value: string, index: number) => {
  const normalizedText = normalizeOptionText(value);
  const normalizedComparison = normalizeForComparison(normalizedText);

  if (normalizedText.length < minOptionTextLength) {
    return true;
  }

  if (isLabelOnlyOption(normalizedText, index)) {
    return true;
  }

  return (
    normalizedComparison === normalizeForComparison(optionLabels[index]) ||
    normalizedComparison === `option ${optionLabels[index].toLowerCase()}` ||
    normalizedComparison === `choice ${optionLabels[index].toLowerCase()}`
  );
};

const buildPrompt = ({
  className,
  subjectName,
  chapterName,
  level,
  questionCount,
}: GenerateMockTestInput) => `
Generate a school mock test.

Class: ${className}
Subject: ${subjectName}
${chapterName ? `Chapter: ${chapterName}` : "Chapter: General (whole subject)"}
Difficulty level: ${level}
Number of questions: ${questionCount}

Return ONLY valid JSON in this exact structure:

{
  "title": "string",
  "questions": [
    {
      "question": "string",
      "options": [
        { "key": "A", "text": "option text 1" },
        { "key": "B", "text": "option text 2" },
        { "key": "C", "text": "option text 3" },
        { "key": "D", "text": "option text 4" }
      ],
      "correctAnswer": "A",
      "explanation": "short explanation"
    }
  ]
}

Rules:
- Questions must match the class, subject${chapterName ? ", chapter" : ""}, and difficulty level.
${chapterName ? `- Focus questions specifically on the chapter "${chapterName}".` : "- Cover core topics from the subject."}
- Each question must contain exactly 4 options.
- Every option must be an object with key and text.
- Keys must be exactly A, B, C, and D.
- Option texts must be full answer texts, not just labels like A, B, C, or D.
- Example: if the question is "What is 2 * 2?", options should look like [{"key":"A","text":"1"}, {"key":"B","text":"4"}, {"key":"C","text":"9"}, {"key":"D","text":"None of the above"}].
- correctAnswer must be only the correct key, such as "A".
- Do not return markdown.
- Do not return explanation outside JSON.
- Return only pure JSON.
`;

const validateQuestions = (questions: unknown): MockQuestion[] => {
  if (!Array.isArray(questions)) {
    throw new Error("questions must be an array");
  }

  if (questions.length === 0) {
    throw new Error("questions must not be empty");
  }

  return questions.map((question, index) => {
    const item = question as Partial<MockQuestion>;

    if (
      typeof item.question !== "string" ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !item.options.every(
        (o) => typeof o?.key === "string" && typeof o?.text === "string",
      ) ||
      typeof item.correctAnswer !== "string" ||
      typeof item.explanation !== "string"
    ) {
      throw new Error(`Question ${index + 1} is invalid`);
    }

    const normalizedOptions = item.options.map((option) => ({
      key: normalizeOptionKey(option.key),
      text: normalizeOptionText(option.text),
    }));
    const normalizedQuestion = item.question.trim();
    const normalizedCorrectAnswer = normalizeOptionKey(item.correctAnswer);
    const normalizedExplanation = item.explanation.trim();
    const uniqueKeys = new Set(normalizedOptions.map((option) => option.key));
    const uniqueTexts = new Set(
      normalizedOptions.map((option) => normalizeForComparison(option.text)),
    );

    if (normalizedQuestion.length < minQuestionLength) {
      throw new Error(
        `Question ${index + 1} must contain a complete question`,
      );
    }

    if (normalizedExplanation.length < minExplanationLength) {
      throw new Error(
        `Question ${index + 1} must include a meaningful explanation`,
      );
    }

    if (
      normalizedOptions.some(
        (option, optionIndex) => option.key !== optionLabels[optionIndex],
      )
    ) {
      throw new Error(
        `Question ${index + 1} must use option keys A, B, C, and D in order`,
      );
    }

    if (uniqueKeys.size !== normalizedOptions.length) {
      throw new Error(
        `Question ${index + 1} contains duplicate option keys`,
      );
    }

    if (
      !normalizedOptions.some(
        (option) => option.key === normalizedCorrectAnswer,
      )
    ) {
      throw new Error(
        `Question ${index + 1} has a correctAnswer not present in options`,
      );
    }

    if (hasPlaceholderOptions(normalizedOptions)) {
      throw new Error(
        `Question ${index + 1} contains placeholder options instead of answer text`,
      );
    }

    if (
      normalizedOptions.some((option, optionIndex) =>
        isWeakOptionText(option.text, optionIndex),
      )
    ) {
      throw new Error(
        `Question ${index + 1} contains weak option text`,
      );
    }

    if (uniqueTexts.size !== normalizedOptions.length) {
      throw new Error(
        `Question ${index + 1} contains duplicate option texts`,
      );
    }

    return {
      question: normalizedQuestion,
      options: normalizedOptions,
      correctAnswer: normalizedCorrectAnswer,
      explanation: normalizedExplanation,
    };
  });
};

export const validateMockTestQuestions = validateQuestions;

const normalizeGeneratedMockTest = (
  generated: any,
  input: GenerateMockTestInput,
  provider: string,
  model: string,
) => {
  const title =
    typeof generated.title === "string"
      ? generated.title
      : `${input.className} ${input.subjectName} Mock Test`;

  return {
    title,
    questions: validateQuestions(generated.questions),
    provider,
    model,
  };
};

export const generateMockTestWithAi = async (input: GenerateMockTestInput) => {
  const provider =
    process.env.AI_PROVIDER?.trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase() ?? "groq";

  console.log("AI Provider =>", provider);

  if (provider !== "groq") {
    throw new Error(`Invalid AI_PROVIDER "${provider}". Expected "groq".`);
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  console.log("Using GROQ Model =>", model);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let response;

    try {
      response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You generate school mock tests. Return ONLY pure valid JSON without markdown. Every option must be an object with key and text. Use keys A, B, C, and D exactly once, and return correctAnswer as only the correct key. Internally verify that all option texts are distinct, meaningful, and not placeholders before answering.",
              },
              {
                role: "user",
                content:
                  attempt === 1
                    ? buildPrompt(input)
                    : `${buildPrompt(input)}\n\nYour previous answer was invalid for this exact reason: ${lastError?.message ?? "Invalid AI response"}. Retry using option objects with keys A, B, C, and D, include real option text, make all option texts distinct and meaningful, and ensure \"correctAnswer\" is only the correct key.`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0,
          }),
        },
      );
    } catch (error) {
      console.error("GROQ CONNECTION ERROR =>", error);

      throw new Error("Could not connect to Groq API");
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error("GROQ API ERROR =>", errorText);

      if (response.status === 429) {
        lastError = new AppError(
          "Groq rate limit reached. Please retry in a few seconds.",
          429,
        );

        if (attempt < 4) {
          await wait(
            getRetryDelayMs(response.headers.get("retry-after"), attempt),
          );
          continue;
        }

        throw lastError;
      }

      throw new AppError(`Groq API failed with status ${response.status}`, 502);
    }

    const data = (await response.json()) as GroqChatCompletionResponse;

    console.log("GROQ RAW RESPONSE =>");
    console.dir(data, { depth: null });

    const outputText = data.choices?.[0]?.message?.content;

    if (!outputText) {
      throw new Error("Groq returned empty content");
    }

    console.log("RAW OUTPUT =>", outputText);

    const cleanedOutput = normalizeJsonText(outputText);
    const jsonOutput = extractJsonObject(cleanedOutput);

    console.log("CLEANED OUTPUT =>", cleanedOutput);
    console.log("JSON OUTPUT =>", jsonOutput);

    let parsed;

    try {
      parsed = JSON.parse(jsonOutput);
    } catch (error) {
      console.error("JSON PARSE ERROR =>");
      console.error(jsonOutput);

      lastError = new Error("Invalid JSON returned from Groq");
      continue;
    }

    try {
      return normalizeGeneratedMockTest(parsed, input, "groq", model);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Invalid AI response");
      console.error("AI RESPONSE VALIDATION ERROR =>", lastError.message);
    }
  }

  throw lastError ?? new AppError("Unable to generate a valid mock test", 502);
};
