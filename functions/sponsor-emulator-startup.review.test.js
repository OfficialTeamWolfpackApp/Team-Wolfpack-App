"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {validateStartupRequest: check} = require("./sponsor-emulator-startup.review");
const valid = () => ({
  projectId: "demo-team-wolfpack-sponsorship-isolated",
  configPath: "functions/sponsorship-emulator.review.json",
  only: "database,auth", workingDirectory: "/tmp/team-wolfpack-test",
  env: {GCLOUD_PROJECT: "demo-team-wolfpack-sponsorship-isolated",
    FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:19130",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19131"},
});
test("accepts only the expected isolated startup request", () => {
  const result = check(valid());
  assert.equal(result.ok, true);
  assert.deepEqual(result.command.slice(0, 2), ["firebase", "emulators:start"]);
});
test("rejects production project", () => {
  assert.equal(check({...valid(), projectId: "team-wolfpack-app"}).code, "NON_ISOLATED_PROJECT");
});
test("rejects unrelated config file", () => {
  assert.equal(check({...valid(), configPath: "firebase.json"}).code, "UNEXPECTED_EMULATOR_CONFIG");
});
test("rejects functions emulator startup", () => {
  assert.equal(check({...valid(), only: "database,auth,functions"}).code, "UNEXPECTED_EMULATORS");
});
test("rejects mismatched database port", () => {
  const v = valid(); v.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:8080";
  assert.equal(check(v).code, "UNEXPECTED_DATABASE_PORT");
});
test("rejects mismatched auth port", () => {
  const v = valid(); v.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  assert.equal(check(v).code, "UNEXPECTED_AUTH_PORT");
});
test("rejects remote database host", () => {
  const v = valid(); v.env.FIREBASE_DATABASE_EMULATOR_HOST = "remote.example:19130";
  assert.equal(check(v).code, "UNSAFE_EMULATOR_HOST");
});
test("rejects relative working directory", () => {
  assert.equal(check({...valid(), workingDirectory: "."}).code, "INVALID_WORKING_DIRECTORY");
});
