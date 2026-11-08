"use strict";

// REVIEW/TEST ONLY. Refuses any environment other than an isolated demo project
// and a loopback RTDB emulator. No Firebase Admin initialization or writes.
const net = require("node:net");

function validateEmulatorEnvironment(env = process.env) {
  const projectId = env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT || env.FIREBASE_PROJECT_ID;
  if (projectId !== "demo-team-wolfpack-sponsorship-isolated") {
    return {ok: false, code: "NON_ISOLATED_PROJECT"};
  }
  const host = env.FIREBASE_DATABASE_EMULATOR_HOST;
  const match = typeof host === "string" &&
    /^(127\.0\.0\.1|localhost):([0-9]{1,5})$/.exec(host);
  if (!match || Number(match[2]) < 1024 || Number(match[2]) > 65535) {
    return {ok: false, code: "UNSAFE_EMULATOR_HOST"};
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST &&
      !/^(127\.0\.0\.1|localhost):([0-9]{1,5})$/.test(env.FIREBASE_AUTH_EMULATOR_HOST)) {
    return {ok: false, code: "UNSAFE_AUTH_EMULATOR_HOST"};
  }
  if (env.FIREBASE_DATABASE_URL &&
      !/^http:\/\/(127\.0\.0\.1|localhost):[0-9]{1,5}(\/|$)/.test(env.FIREBASE_DATABASE_URL)) {
    return {ok: false, code: "UNSAFE_DATABASE_URL"};
  }
  return {ok: true, code: "ISOLATED_EMULATOR_ENVIRONMENT", host};
}

function checkEmulatorReachable(host, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const [hostname, port] = host.split(":");
    const socket = net.connect({host: hostname, port: Number(port)});
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

module.exports = {validateEmulatorEnvironment, checkEmulatorReachable};
