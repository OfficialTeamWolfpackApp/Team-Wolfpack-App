"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "submit-sponsorship-application.js"), "utf8");

function harness(env = {}, {appCheckValid = true} = {}) {
  const writes = [];
  let dbCalls = 0;
  const database = {
    ref(name) {
      return {
        child(key) {
          assert.equal(name, "sponsorshipApplicationLimits");
          assert.match(key, /^[a-f0-9]{64}$/);
          return {async transaction(fn) {
            const next = fn(null);
            return {committed: next !== undefined};
          }};
        },
        push() {
          assert.equal(name, "sponsorshipApplications");
          return {key: "test-id", async set(value) { writes.push(value); }};
        }
      };
    }
  };
  const admin = {
    appCheck() { return {async verifyToken(token) {
      if (!appCheckValid || token !== "valid-token") throw Error("invalid");
    }}; },
    app() { return {database(url) {
      dbCalls++;
      assert.match(url, /^https:\/\//);
      return database;
    }}; }
  };
  const module = {exports: {}};
  const context = {
    module, exports: module.exports, process: {env},
    Buffer, Date, Number, String, Object, Set, console: {error() {}},
    require(id) {
      if (id === "firebase-functions/v2/https") return {onRequest: (_options, handler) => handler};
      if (id === "firebase-admin") return admin;
      if (id === "node:crypto") return require(id);
      throw Error("Unexpected dependency: " + id);
    }
  };
  vm.runInNewContext(source, context, {filename: "submit-sponsorship-application.js"});
  const handler = module.exports.submitSponsorshipApplication;
  async function request({
    origin = "https://app.officialteamwolfpack.com",
    method = "POST", token = "valid-token", body = validBody(), rawBytes = 100
  } = {}) {
    const headers = {
      origin, "content-type": "application/json",
      "X-Firebase-AppCheck": token
    };
    const req = {
      method, ip: "192.0.2.5", body,
      rawBody: Buffer.alloc(rawBytes),
      get(name) { return headers[name.toLowerCase()] ?? headers[name]; }
    };
    let code = 200, payload;
    const res = {
      set() { return this; },
      status(value) { code = value; return this; },
      json(value) { payload = value; return this; },
      end() { return this; }
    };
    await handler(req, res);
    return {code, payload};
  }
  return {request, writes, get dbCalls() { return dbCalls; }};
}
function validBody() {
  return {
    type: "personal", fullName: "Test User", businessName: "",
    location: "Walsall", email: "test@example.org", website: "",
    bio: "Test application", packageId: "pack",
    proposedAmountPence: 1000, message: "", websiteTrap: ""
  };
}

const isolated = {
  FUNCTIONS_EMULATOR: "true",
  GCLOUD_PROJECT: "demo-team-wolfpack-profile-images-isolated",
  FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:19012"
};

test("rejects unapproved origin before database access", async () => {
  const h = harness(isolated);
  assert.equal((await h.request({origin: "https://example.org"})).code, 403);
  assert.equal(h.dbCalls, 0);
});
test("rejects missing and invalid App Check tokens", async () => {
  const h = harness(isolated);
  assert.equal((await h.request({token: ""})).code, 401);
  assert.equal((await h.request({token: "invalid"})).code, 401);
  assert.equal(h.dbCalls, 0);
});
test("rejects unknown fields and mismatched package types", async () => {
  const h = harness(isolated);
  assert.equal((await h.request({body: {...validBody(), isAdmin: true}})).code, 400);
  assert.equal((await h.request({body: {...validBody(), packageId: "business"}})).code, 400);
  assert.equal(h.dbCalls, 0);
});
test("rejects oversized request", async () => {
  const h = harness(isolated);
  assert.equal((await h.request({rawBytes: 16001})).code, 413);
  assert.equal(h.dbCalls, 0);
});
test("rejects emulator with wrong database host without database access", async () => {
  const h = harness({...isolated, FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000"});
  assert.equal((await h.request()).code, 500);
  assert.equal(h.dbCalls, 0);
});
test("rejects emulator with wrong project without database access", async () => {
  const h = harness({...isolated, GCLOUD_PROJECT: "team-wolfpack-app"});
  assert.equal((await h.request()).code, 500);
  assert.equal(h.dbCalls, 0);
});
test("rejects unknown non-emulator project without database access", async () => {
  const h = harness({GCLOUD_PROJECT: "unexpected-project"});
  assert.equal((await h.request()).code, 500);
  assert.equal(h.dbCalls, 0);
});
test("valid isolated request writes only to mocked database", async () => {
  const h = harness(isolated);
  const result = await h.request();
  assert.equal(result.code, 201);
  assert.equal(result.payload.success, true);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].status, "new");
  assert.equal(h.writes[0].email, "test@example.org");
});
