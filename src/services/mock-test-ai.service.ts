type MockTestLevel = "easy" | "medium" | "hard";

export interface MockQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GenerateMockTestInput {
  className: string;
  subjectName: string;
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

const buildPrompt = ({
  className,
  subjectName,
  level,
  questionCount,
}: GenerateMockTestInput) => `
Generate a school mock test.

Class: ${className}
Subject: ${subjectName}
Difficulty level: ${level}
Number of questions: ${questionCount}

Return ONLY valid JSON in this exact structure:

{
  "title": "string",
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "one exact option from options",
      "explanation": "short explanation"
    }
  ]
}

Rules:
- Questions must match the class, subject, and difficulty level.
- Each question must contain exactly 4 options.
- Do not return markdown.
- Do not return explanation outside JSON.
- Return only pure JSON.
`;

const validateQuestions = (questions: unknown): MockQuestion[] => {
  if (!Array.isArray(questions)) {
    throw new Error("AI response questions must be an array");
  }

  return questions.map((question, index) => {
    const item = question as Partial<MockQuestion>;

    if (
      typeof item.question !== "string" ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !item.options.every((option) => typeof option === "string") ||
      typeof item.correctAnswer !== "string" ||
      typeof item.explanation !== "string"
    ) {
      throw new Error(`AI response question ${index + 1} is invalid`);
    }

    return {
      question: item.question,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
    };
  });
};

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

  let response;

  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              "You generate school mock tests. Return ONLY pure valid JSON without markdown.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
        temperature: 0.3,
      }),
    });
  } catch (error) {
    console.error("GROQ CONNECTION ERROR =>", error);

    throw new Error("Could not connect to Groq API");
  }

  if (!response.ok) {
    const errorText = await response.text();

    console.error("GROQ API ERROR =>", errorText);

    throw new Error(`Groq API failed with status ${response.status}`);
  }

  const data = (await response.json()) as GroqChatCompletionResponse;

  console.log("GROQ RAW RESPONSE =>");
  console.dir(data, { depth: null });

  const outputText = data.choices?.[0]?.message?.content;

  if (!outputText) {
    throw new Error("Groq returned empty content");
  }

  console.log("RAW OUTPUT =>", outputText);

  const cleanedOutput = outputText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  console.log("CLEANED OUTPUT =>", cleanedOutput);

  let parsed;

  try {
    parsed = JSON.parse(cleanedOutput);
  } catch (error) {
    console.error("JSON PARSE ERROR =>");
    console.error(cleanedOutput);

    throw new Error("Invalid JSON returned from Groq");
  }

  return normalizeGeneratedMockTest(parsed, input, "groq", model);
};
