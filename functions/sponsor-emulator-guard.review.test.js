"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {validateEmulatorEnvironment: check, checkEmulatorReachable} =
  require("./sponsor-emulator-guard.review");
const valid = () => ({GCLOUD_PROJECT: "demo-team-wolfpack-sponsorship-isolated",
  FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:19130"});
test("isolated demo project and loopback are accepted", () => {
  assert.equal(check(valid()).ok, true);
});
test("production project is rejected", () => {
  assert.equal(check({...valid(), GCLOUD_PROJECT: "team-wolfpack-app"}).code,
    "NON_ISOLATED_PROJECT");
});
test("missing project is rejected", () => {
  assert.equal(check({FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:19130"}).ok, false);
});
test("remote database host is rejected", () => {
  assert.equal(check({...valid(), FIREBASE_DATABASE_EMULATOR_HOST: "example.com:19130"}).code,
    "UNSAFE_EMULATOR_HOST");
});
test("missing database emulator host is rejected", () => {
  assert.equal(check({GCLOUD_PROJECT: valid().GCLOUD_PROJECT}).ok, false);
});
test("invalid emulator port is rejected", () => {
  assert.equal(check({...valid(), FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:0"}).ok, false);
});
test("remote auth emulator host is rejected", () => {
  assert.equal(check({...valid(), FIREBASE_AUTH_EMULATOR_HOST: "example.com:9099"}).code,
    "UNSAFE_AUTH_EMULATOR_HOST");
});
test("production database URL is rejected", () => {
  assert.equal(check({...valid(), FIREBASE_DATABASE_URL: "https://real.firebaseio.com"}).code,
    "UNSAFE_DATABASE_URL");
});
test("local database URL is accepted", () => {
  assert.equal(check({...valid(), FIREBASE_DATABASE_URL: "http://127.0.0.1:19130"}).ok, true);
});
test("unavailable loopback port fails readiness check", async () => {
  assert.equal(await checkEmulatorReachable("127.0.0.1:1", 150), false);
});
