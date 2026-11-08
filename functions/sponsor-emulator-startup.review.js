"use strict";

// TEST-ONLY launcher guard. This script never starts an emulator itself.
// It checks a requested CLI invocation before an operator executes it.
const path = require("node:path");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");

const EXPECTED_PROJECT = "demo-team-wolfpack-sponsorship-isolated";
const EXPECTED_CONFIG = "functions/sponsorship-emulator.review.json";

function validateStartupRequest({projectId, configPath, only, env, workingDirectory}) {
  if (projectId !== EXPECTED_PROJECT) {
    return {ok: false, code: "NON_ISOLATED_PROJECT"};
  }
  if (typeof configPath !== "string" ||
      configPath.replaceAll("\\", "/") !== EXPECTED_CONFIG) {
    return {ok: false, code: "UNEXPECTED_EMULATOR_CONFIG"};
  }
  if (only !== "database,auth") {
    return {ok: false, code: "UNEXPECTED_EMULATORS"};
  }
  if (typeof workingDirectory !== "string" ||
      !path.isAbsolute(workingDirectory)) {
    return {ok: false, code: "INVALID_WORKING_DIRECTORY"};
  }
  const environment = validateEmulatorEnvironment(env);
  if (!environment.ok) return environment;
  if (environment.host !== "127.0.0.1:19130") {
    return {ok: false, code: "UNEXPECTED_DATABASE_PORT"};
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19131") {
    return {ok: false, code: "UNEXPECTED_AUTH_PORT"};
  }
  return {ok: true, code: "STARTUP_REQUEST_VALIDATED", command: [
    "firebase", "emulators:start",
    "--project", EXPECTED_PROJECT,
    "--config", EXPECTED_CONFIG,
    "--only", "database,auth",
  ]};
}
module.exports = {validateStartupRequest};
