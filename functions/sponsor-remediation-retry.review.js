"use strict";

// REVIEW ONLY: deterministic RTDB-style transaction retry simulation.
// This is NOT an actual Firebase emulator or deployed transaction.
const {proposeSponsorRemediation} = require("./sponsor-remediation.review");

function simulateRemediationRetry({initialState, concurrentState, input}) {
  const first = proposeSponsorRemediation({...input, state: initialState});
  if (!first.ok || first.noop) {
    return {first, final: first, committed: false, finalState: initialState};
  }
  // A concurrent write invalidates the initial snapshot; re-run guards on
  // the new state rather than applying the stale first proposal.
  const final = concurrentState === undefined ? first :
    proposeSponsorRemediation({...input, state: concurrentState});
  const committed = final.ok === true && final.noop === false;
  return {first, final, committed,
    finalState: committed ? final.nextState :
      concurrentState === undefined ? initialState : concurrentState};
}
module.exports = {simulateRemediationRetry};
