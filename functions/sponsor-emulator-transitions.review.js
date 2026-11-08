"use strict";
// REVIEW ONLY: actual isolated RTDB emulator test for link/status/unlink transitions.
// Uses REST conditional writes, not Firebase Admin SDK transaction().
const assert = require("node:assert/strict");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {applySponsorTransition} = require("./sponsor-transaction-model.review");

async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const namespace = "demo-team-wolfpack-sponsorship-isolated-default-rtdb";
  const key = "transition_" + process.pid + "_" + Date.now();
  const url = "http://127.0.0.1:19130/sponsorAccountManagement/" +
    key + ".json?ns=" + encodeURIComponent(namespace);
  const request = async (method, body, headers = {}) => fetch(url, {
    method, headers: {...headers, ...(body === undefined ? {} : {"content-type": "application/json"})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  async function transition(operation, eventId, active) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const read = await request("GET", undefined, {"X-Firebase-ETag": "true"});
      assert.equal(read.status, 200);
      const state = await read.json() || {};
      const proposed = applySponsorTransition({state, operation, sponsorId: "s1", uid: "u1",
        active, eventId, administratorUid: "test-admin", timestamp: 100 + attempt});
      assert.equal(proposed.verdict.ok, true, proposed.verdict.code);
      assert.equal(proposed.verdict.noop, false, "unexpected no-op");
      const committed = await request("PUT", proposed.nextState,
        {"if-match": read.headers.get("etag")});
      if (committed.status === 200) return;
      assert.equal(committed.status, 412, "unexpected conditional write status");
    }
    assert.fail("transaction retry limit exceeded");
  }
  // Fail closed if emulator is unavailable. Only test-created path is written.
  const ready = await request("GET");
  assert.equal(ready.status, 200, "isolated emulator unavailable");
  try {
    await transition("link", "link-event");
    let state = await (await request("GET")).json();
    assert.equal(state.linksBySponsor.s1, "u1");
    assert.equal(state.linksByUid.u1, "s1");
    assert.equal(state.accountStatus.u1.active, false);
    assert.equal(state.auditEvents["link-event"].action, "LINKED");
    await transition("setStatus", "activate-event", true);
    state = await (await request("GET")).json();
    assert.equal(state.accountStatus.u1.active, true);
    assert.equal(state.auditEvents["activate-event"].action, "ACTIVATED");
    await transition("setStatus", "deactivate-event", false);
    state = await (await request("GET")).json();
    assert.equal(state.accountStatus.u1.active, false);
    assert.equal(state.auditEvents["deactivate-event"].action, "DEACTIVATED");
    await transition("unlink", "unlink-event");
    state = await (await request("GET")).json();
    assert.equal(state.linksBySponsor?.s1, undefined);
    assert.equal(state.linksByUid?.u1, undefined);
    assert.equal(state.accountStatus.u1.active, false);
    assert.equal(state.auditEvents["unlink-event"].action, "UNLINKED");
    assert.equal(Object.keys(state.auditEvents).length, 4);
    // Two administrators race on the same sponsor. A stale conditional write
    // must not overwrite the winner or manufacture an audit event.
    const firstRead = await request("GET", undefined, {"X-Firebase-ETag": "true"});
    assert.equal(firstRead.status, 200);
    const staleTag = firstRead.headers.get("etag");
    assert.ok(staleTag, "missing initial concurrency ETag");
    const beforeRace = await firstRead.json();
    const winning = applySponsorTransition({state: beforeRace, operation: "link",
      sponsorId: "s2", uid: "u2", eventId: "winner-event",
      administratorUid: "admin-a", timestamp: 200});
    const losing = applySponsorTransition({state: beforeRace, operation: "link",
      sponsorId: "s2", uid: "u3", eventId: "loser-event",
      administratorUid: "admin-b", timestamp: 201});
    assert.equal(winning.verdict.ok, true);
    assert.equal(losing.verdict.ok, true);
    assert.equal((await request("PUT", winning.nextState, {"if-match": staleTag})).status, 200);
    assert.equal((await request("PUT", losing.nextState, {"if-match": staleTag})).status, 412);
    const afterRace = await (await request("GET")).json();
    assert.equal(afterRace.linksBySponsor.s2, "u2");
    assert.equal(afterRace.linksByUid.u2, "s2");
    assert.equal(afterRace.linksByUid.u3, undefined);
    assert.equal(afterRace.auditEvents["winner-event"].action, "LINKED");
    assert.equal(afterRace.auditEvents["loser-event"], undefined);
    const retried = applySponsorTransition({state: afterRace, operation: "link",
      sponsorId: "s2", uid: "u3", eventId: "loser-event",
      administratorUid: "admin-b", timestamp: 202});
    assert.equal(retried.verdict.ok, false, "conflicting retry must fail closed");
    assert.equal(retried.nextState, null);
    assert.equal(Object.keys(afterRace.auditEvents).length, 5);
    console.log("ISOLATED SPONSOR LINK CONFLICT TEST PASSED");
    console.log("ISOLATED SPONSOR TRANSITION EMULATOR TEST PASSED");
  } finally {
    const removed = await request("DELETE");
    assert.equal(removed.status, 200, "test-only cleanup failed");
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
