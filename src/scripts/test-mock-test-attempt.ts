import assert from "node:assert/strict";
import {
  computeAttemptEndsAt,
  deriveQuestionStatuses,
  getRemainingSeconds,
  hasAttemptExpired,
  parseDurationSeconds,
  parseSubmissionReason,
} from "../services/mock-test-attempt.service";

function run() {
  assert.equal(parseDurationSeconds(1800), 1800);
  assert.equal(parseDurationSeconds({ durationMinutes: 30 }), 1800);
  assert.throws(() => parseDurationSeconds(30), /between/);
  assert.equal(parseSubmissionReason("time_expired"), "TIME_EXPIRED");
  assert.equal(parseSubmissionReason("nope"), "MANUAL_SUBMIT");

  const started = new Date("2026-09-09T10:00:00.000Z");
  const ends = computeAttemptEndsAt(started, 600);
  assert.equal(ends?.toISOString(), "2026-09-09T10:10:00.000Z");

  assert.equal(
    getRemainingSeconds("2026-09-09T10:10:00.000Z", new Date("2026-09-09T10:05:00.000Z")),
    300,
  );
  assert.equal(
    hasAttemptExpired("2026-09-09T10:10:00.000Z", new Date("2026-09-09T10:11:00.000Z")),
    true,
  );

  const statuses = deriveQuestionStatuses({
    questionCount: 3,
    answers: { 0: "A", 1: null },
    statuses: { 1: "SKIPPED", 2: "NOT_VISITED" },
  });
  assert.equal(statuses["0"], "ANSWERED");
  assert.equal(statuses["1"], "SKIPPED");
  assert.equal(statuses["2"], "NOT_VISITED");

  console.log("mock-test-attempt.service tests passed");
}

run();
