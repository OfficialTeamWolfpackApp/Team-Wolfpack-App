"use strict";

// REVIEW ONLY: adapter for the existing Firebase transaction callback.
// It deliberately returns undefined on rejection/no-op, as RTDB transaction
// callbacks require. Do not wire into deployed Functions without emulator tests.
const {applySponsorTransition} = require("./sponsor-transaction-model.review");

function reviewTransactionCallback(current, input) {
  const state = current && typeof current === "object" &&
    !Array.isArray(current) ? current : {};
  const result = applySponsorTransition({...input, state});
  return {outcome: result.verdict.code,
    nextValue: result.nextState === null ? undefined : result.nextState};
}

module.exports = {reviewTransactionCallback};
