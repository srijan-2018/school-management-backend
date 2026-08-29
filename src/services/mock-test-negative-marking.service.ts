import School from "../models/school.model";
import { AppError } from "../middlewares/error.middleware";
import { isSchoolFeatureEnabled } from "./school-feature.service";
import type { SchoolFeatureKey } from "../utils/school-features";

export const MOCK_TEST_NEGATIVE_MARKING_FEATURE_KEY =
  "mock-test-negative-marking" as const satisfies SchoolFeatureKey;

export const DEFAULT_NEGATIVE_MARKING_PENALTY = 0.25;
export const NEGATIVE_MARKING_PENALTY_OPTIONS = [0.25, 0.33, 0.5, 1] as const;
export const MARKS_PER_CORRECT = 1;

export type NegativeMarkingRule = {
  featureEnabled: boolean;
  enabled: boolean;
  penalty: number;
  marksPerCorrect: typeof MARKS_PER_CORRECT;
};

export type NegativeMarkingSnapshot = {
  negativeMarkingEnabled: boolean;
  negativeMarkingPenalty: number;
};

export function normalizeNegativeMarkingPenalty(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1) {
    return DEFAULT_NEGATIVE_MARKING_PENALTY;
  }

  return Math.round(numeric * 100) / 100;
}

export function serializeNegativeMarkingSnapshot(
  value: Partial<NegativeMarkingSnapshot> | null | undefined,
): NegativeMarkingSnapshot {
  return {
    negativeMarkingEnabled: Boolean(value?.negativeMarkingEnabled),
    negativeMarkingPenalty: normalizeNegativeMarkingPenalty(
      value?.negativeMarkingPenalty,
    ),
  };
}

export async function getSchoolNegativeMarkingRule(
  schoolId: number,
): Promise<NegativeMarkingRule> {
  const featureEnabled = await isSchoolFeatureEnabled(
    schoolId,
    MOCK_TEST_NEGATIVE_MARKING_FEATURE_KEY,
  );
  const school = await School.findByPk(schoolId);
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const schoolEnabled = Boolean(school.mockTestNegativeMarkingEnabled);
  const penalty = normalizeNegativeMarkingPenalty(
    school.mockTestNegativeMarkingPenalty,
  );

  return {
    featureEnabled,
    enabled: featureEnabled && schoolEnabled,
    penalty,
    marksPerCorrect: MARKS_PER_CORRECT,
  };
}

export async function updateSchoolNegativeMarkingRule(
  schoolId: number,
  input: { enabled?: unknown; penalty?: unknown },
): Promise<NegativeMarkingRule> {
  const current = await getSchoolNegativeMarkingRule(schoolId);
  if (!current.featureEnabled) {
    throw new AppError(
      "Negative marking is not available for this school. Super Admin must enable the feature first.",
      403,
    );
  }

  const school = await School.findByPk(schoolId);
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const nextEnabled =
    input.enabled === undefined
      ? Boolean(school.mockTestNegativeMarkingEnabled)
      : Boolean(input.enabled);
  const nextPenalty =
    input.penalty === undefined
      ? current.penalty
      : normalizeNegativeMarkingPenalty(input.penalty);

  await school.update({
    mockTestNegativeMarkingEnabled: nextEnabled,
    mockTestNegativeMarkingPenalty: nextPenalty,
  });

  return getSchoolNegativeMarkingRule(schoolId);
}

export async function resolveNegativeMarkingSnapshot(
  schoolId: number | null | undefined,
): Promise<NegativeMarkingSnapshot> {
  if (!Number.isInteger(schoolId) || !schoolId || schoolId <= 0) {
    return {
      negativeMarkingEnabled: false,
      negativeMarkingPenalty: DEFAULT_NEGATIVE_MARKING_PENALTY,
    };
  }

  const rule = await getSchoolNegativeMarkingRule(schoolId);
  return {
    negativeMarkingEnabled: rule.enabled,
    negativeMarkingPenalty: rule.penalty,
  };
}

export function computeMockTestScore(input: {
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  negativeMarkingEnabled: boolean;
  negativeMarkingPenalty?: number;
}) {
  const penalty = input.negativeMarkingEnabled
    ? normalizeNegativeMarkingPenalty(input.negativeMarkingPenalty)
    : 0;
  const rawScore =
    input.correctCount * MARKS_PER_CORRECT - input.wrongCount * penalty;
  const score = Math.round(Math.max(0, rawScore) * 100) / 100;
  const maxScore = input.totalQuestions * MARKS_PER_CORRECT;
  const percentage = maxScore
    ? Math.round((score / maxScore) * 10000) / 100
    : 0;

  return {
    score,
    maxScore,
    percentage,
    penalty,
    marksPerCorrect: MARKS_PER_CORRECT,
  };
}
