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

Return only valid JSON in this exact shape:
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
- Questions must match the class, subject, and level.
- Each question must have exactly 4 options.
- Do not include markdown or extra text.
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
    process.env.AI_PROVIDER?.trim().replace(/^["']|["']$/g, "").toLowerCase() ??
    "groq";
  if (provider !== "groq") {
    throw new Error(
      `This mock test generator is configured to use Groq. Current AI_PROVIDER is "${provider}". Set AI_PROVIDER=groq in .env and restart the server.`,
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is required. Create a key at https://console.groq.com/keys, add it to .env, and restart the server.",
    );
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  let response: Response;

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
              "You generate school mock tests. Return only valid JSON and no markdown.",
          },
          { role: "user", content: buildPrompt(input) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
  } catch {
    throw new Error(
      "Could not connect to Groq. Check your internet connection and GROQ_API_KEY.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Groq request failed with status ${response.status}: ${errorText}`,
    );
  }

  const data = (await response.json()) as GroqChatCompletionResponse;
  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("Groq response was empty");
  }

  return normalizeGeneratedMockTest(
    JSON.parse(outputText),
    input,
    "groq",
    model,
  );
};
