export const MOCK_TEST_SUBMISSION_REASONS = [
  "MANUAL_SUBMIT",
  "TIME_EXPIRED",
  "EXAM_EXIT",
] as const;

export type MockTestSubmissionReason =
  (typeof MOCK_TEST_SUBMISSION_REASONS)[number];

export type MockTestQuestionStatus =
  | "NOT_VISITED"
  | "ANSWERED"
  | "SKIPPED";

export const MIN_MOCK_TEST_DURATION_SECONDS = 60;
export const MAX_MOCK_TEST_DURATION_SECONDS = 6 * 60 * 60;
export const DEFAULT_MOCK_TEST_DURATION_SECONDS = 30 * 60;

export function parseDurationSeconds(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (record.durationSeconds !== undefined) {
      return parseDurationSeconds(record.durationSeconds);
    }
    if (record.durationMinutes !== undefined) {
      const minutes = Number(record.durationMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error("durationMinutes must be a positive number");
      }
      return Math.round(minutes * 60);
    }
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    throw new Error("durationSeconds must be a positive number");
  }

  const seconds = Math.round(asNumber);
  if (
    seconds < MIN_MOCK_TEST_DURATION_SECONDS ||
    seconds > MAX_MOCK_TEST_DURATION_SECONDS
  ) {
    throw new Error(
      `durationSeconds must be between ${MIN_MOCK_TEST_DURATION_SECONDS} and ${MAX_MOCK_TEST_DURATION_SECONDS}`,
    );
  }

  return seconds;
}

export function parseDurationSecondsFromBody(
  body: Record<string, unknown>,
  options?: { required?: boolean; fallback?: number | null },
): number | null {
  const required = options?.required ?? false;
  const fallback =
    options?.fallback === undefined
      ? DEFAULT_MOCK_TEST_DURATION_SECONDS
      : options.fallback;

  try {
    if (
      body.durationSeconds !== undefined &&
      body.durationSeconds !== null &&
      body.durationSeconds !== ""
    ) {
      return parseDurationSeconds(body.durationSeconds);
    }

    if (
      body.durationMinutes !== undefined &&
      body.durationMinutes !== null &&
      body.durationMinutes !== ""
    ) {
      return parseDurationSeconds({ durationMinutes: body.durationMinutes });
    }
  } catch (error) {
    throw error;
  }

  if (required) {
    throw new Error("durationSeconds or durationMinutes is required");
  }

  return fallback;
}

export function parseSubmissionReason(
  value: unknown,
  fallback: MockTestSubmissionReason = "MANUAL_SUBMIT",
): MockTestSubmissionReason {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    MOCK_TEST_SUBMISSION_REASONS.includes(
      normalized as MockTestSubmissionReason,
    )
  ) {
    return normalized as MockTestSubmissionReason;
  }

  return fallback;
}

export function toIsoOrNull(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function computeAttemptEndsAt(
  startedAt: Date,
  durationSeconds: number | null | undefined,
): Date | null {
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  return new Date(startedAt.getTime() + durationSeconds * 1000);
}

export function getRemainingSeconds(
  endsAt: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  const endsAtIso = toIsoOrNull(endsAt);
  if (!endsAtIso) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil((new Date(endsAtIso).getTime() - now.getTime()) / 1000),
  );
}

export function hasAttemptExpired(
  endsAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const remaining = getRemainingSeconds(endsAt, now);
  return remaining !== null && remaining <= 0;
}

export function deriveQuestionStatuses(input: {
  questionCount: number;
  answers: Map<number, string | null> | Record<string, string | null>;
  statuses?: unknown;
}): Record<string, MockTestQuestionStatus> {
  const existing =
    input.statuses && typeof input.statuses === "object"
      ? (input.statuses as Record<string, unknown>)
      : {};

  const answerMap =
    input.answers instanceof Map
      ? input.answers
      : new Map(
          Object.entries(input.answers).map(([key, value]) => [
            Number(key),
            value,
          ]),
        );

  const next: Record<string, MockTestQuestionStatus> = {};

  for (let index = 0; index < input.questionCount; index += 1) {
    const key = String(index);
    const answer = answerMap.get(index);
    const hasAnswer = typeof answer === "string" && answer.trim().length > 0;
    const previous = String(existing[key] ?? "").toUpperCase();

    if (hasAnswer) {
      next[key] = "ANSWERED";
      continue;
    }

    if (previous === "SKIPPED" || previous === "ANSWERED") {
      next[key] = "SKIPPED";
      continue;
    }

    next[key] = "NOT_VISITED";
  }

  return next;
}

export function serializeAttemptTiming(mockTest: {
  durationSeconds?: number | null;
  attemptStartedAt?: Date | string | null;
  attemptEndsAt?: Date | string | null;
  submissionReason?: string | null;
  draftAnswers?: unknown;
  questionStatuses?: unknown;
  status?: string;
}) {
  const attemptStartedAt = toIsoOrNull(mockTest.attemptStartedAt);
  const attemptEndsAt = toIsoOrNull(mockTest.attemptEndsAt);
  const now = new Date();
  const remainingSeconds = getRemainingSeconds(attemptEndsAt, now);
  const isInProgress =
    mockTest.status === "generated" && Boolean(attemptStartedAt);
  const isExpired =
    isInProgress && hasAttemptExpired(attemptEndsAt, now);

  return {
    durationSeconds:
      typeof mockTest.durationSeconds === "number"
        ? mockTest.durationSeconds
        : null,
    durationMinutes:
      typeof mockTest.durationSeconds === "number"
        ? Math.round((mockTest.durationSeconds / 60) * 100) / 100
        : null,
    attemptStartedAt,
    attemptEndsAt,
    remainingSeconds,
    isAttemptStarted: Boolean(attemptStartedAt),
    isAttemptInProgress: isInProgress && !isExpired,
    isAttemptExpired: isExpired,
    submissionReason: mockTest.submissionReason ?? null,
    draftAnswers: mockTest.draftAnswers ?? null,
    questionStatuses: mockTest.questionStatuses ?? null,
    serverNow: now.toISOString(),
  };
}
