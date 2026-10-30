#!/usr/bin/env node
/* STEP 1778O — offline structural regression checks. This does NOT run Firebase's rules engine. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, "../firebase/database.rules.json"), "utf8")).rules;
const p = rules.publicSupporterProfiles;
assert.equal(rules[".read"], false);
assert.equal(rules[".write"], false);
assert.equal(p[".read"], true);
const owner = p["$uid"];
for (const required of ["auth.uid === $uid", "auth.token.email_verified === true", "newData.exists()", "newData.child('joinedAt').val() === data.child('joinedAt').val()", "newData.child('joinedAt').val() === now"]) {
  assert.ok(owner[".write"].includes(required), "Missing profile protection: " + required);
}
assert.ok(owner[".validate"].includes("name"));
assert.ok(owner[".validate"].includes("joinedAt"));
assert.equal(owner["$other"][".validate"], false);
for (const [field, length] of Object.entries({location:80,bio:600,facebook:300,instagram:300,tiktok:300,youtube:300,website:300})) {
  assert.ok(owner[field], "Missing field: " + field);
  assert.ok(owner[field][".validate"].includes("length <= " + length), "Wrong limit: " + field);
}
for (const field of ["facebook","instagram","tiktok","youtube","website"]) {
  assert.ok(owner[field][".validate"].includes("matches(/^https:"), "HTTPS validation missing: " + field);
}
assert.equal(rules.supporterProfiles[".read"].includes("auth.uid"), true);
assert.equal(rules.memberBadges["$uid"][".write"].includes("auth.uid === '"), true);
assert.equal(rules.officialTeamBadges["$uid"][".write"].includes("auth.uid === '"), true);
assert.equal(rules.officialTeamAccountLinks[".write"].includes("auth.uid === '"), true);
console.log("PASS: JSON and structural security invariants (NOT Firebase emulator tests)");
