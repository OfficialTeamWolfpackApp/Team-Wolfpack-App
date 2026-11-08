"use strict";

// Safety gate for the incomplete sponsorship development scaffold.
// This test deliberately does not contact Firebase.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public sponsorship submissions stay disabled", () => {
  const source = read("sponsorship-application.js");
  assert.match(source, /(?:const|let|var)\s+SPONSORSHIP_SUBMISSIONS_ENABLED\s*=\s*false\b/);
  assert.match(source, /(?:const|let|var)\s+SPONSORSHIP_FUNCTION_URL\s*=\s*["']["']/);
});

test("sponsorship admin reads stay disabled", () => {
  const source = read("admin-sponsorship-enquiries.js");
  assert.match(source, /(?:const|let|var)\s+ENABLE_SPONSORSHIP_ADMIN_READS\s*=\s*false\b/);
});

test("no Firebase deployment configuration in this branch", () => {
  for (const name of ["firebase.json", ".firebaserc"]) {
    assert.equal(fs.existsSync(path.join(root, name)), false, name + " must not be added without review");
  }
});

test("development entry point is not a replacement for production exports", () => {
  const source = read("functions/index.js");
  assert.match(source, /Existing production functions must be merged deliberately before deployment/);
  const exports = [...source.matchAll(/exports\.([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1]);
  assert.deepEqual(exports, ["submitSponsorshipApplication"]);
});

test("no GitHub Actions workflow can deploy Firebase", () => {
  const workflowDir = path.join(root, ".github", "workflows");
  for (const name of fs.readdirSync(workflowDir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const source = fs.readFileSync(path.join(workflowDir, name), "utf8");
    assert.doesNotMatch(source, /\bfirebase\s+deploy\b|\bFirebaseExtended\/action-hosting-deploy\b/i,
      "Potential Firebase deploy action in " + name);
  }
});
