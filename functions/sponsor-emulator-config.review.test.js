"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "sponsorship-emulator.review.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, "sponsorship-emulator.review.rules.json"), "utf8"));
test("database and auth emulators bind loopback on separate ports", () => {
  const {database, auth} = config.emulators;
  assert.equal(database.host, "127.0.0.1");
  assert.equal(auth.host, "127.0.0.1");
  assert.notEqual(database.port, auth.port);
  assert.ok(database.port >= 1024 && auth.port >= 1024);
});
test("emulator UI disabled and single-project mode enabled", () => {
  assert.equal(config.emulators.ui.enabled, false);
  assert.equal(config.emulators.singleProjectMode, true);
});
test("rules deny everything outside the isolated sponsor test path", () => {
  assert.equal(rules.rules[".read"], false);
  assert.equal(rules.rules[".write"], false);
  assert.deepEqual(Object.keys(rules.rules).sort(), [".read", ".write", "sponsorAccountManagement"].sort());
});
test("test path is explicitly writable only in emulator rules", () => {
  assert.equal(rules.rules.sponsorAccountManagement[".write"], true);
  assert.equal(rules.rules.sponsorAccountManagement[".read"], true);
});
test("config references the dedicated rules file", () => {
  assert.equal(config.database.rules, "sponsorship-emulator.review.rules.json");
});
