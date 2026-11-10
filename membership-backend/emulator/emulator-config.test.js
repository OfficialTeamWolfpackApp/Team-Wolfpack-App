"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const dir=__dirname;
const config=JSON.parse(fs.readFileSync(path.join(dir,"firebase.membership-isolated.json"),"utf8"));
const expected="demo-team-wolfpack-membership-isolated";
test("isolated Firebase configuration uses full rules and safe loopback ports",()=>{
 assert.equal(config.database?.rules,"database-rules.full-merged.json");
 assert.deepEqual(config.emulators?.auth,{host:"127.0.0.1",port:19109});
 assert.deepEqual(config.emulators?.database,{host:"127.0.0.1",port:19012});
 assert.deepEqual(config.emulators?.functions,{host:"127.0.0.1",port:15001});
 assert.equal(config.emulators?.ui?.enabled,false);
 assert.equal(config.emulators?.singleProjectMode,true);
});
test("runner requires explicit demo project and full rules fixtures",()=>{
 const runner=fs.readFileSync(path.join(dir,"run-isolated-tests.js"),"utf8");
 assert.ok(runner.includes(expected));
 assert.ok(runner.includes("database-rules.full-merged.json"));
 assert.ok(runner.includes("database-rules.original.snapshot.json"));
 assert.ok(runner.includes("GCLOUD_PROJECT"));
 assert.ok(runner.includes("FIREBASE_DATABASE_EMULATOR_HOST"));
 assert.ok(runner.includes("portFree(port)"));
 assert.ok(runner.includes("19109,19012"));
});
test("private rules suite rejects non-demo environment and uses full fixture",()=>{
 const suite=fs.readFileSync(path.join(dir,"private-database-rules.emulator.test.js"),"utf8");
 assert.ok(suite.includes(expected));
 assert.ok(suite.includes("database-rules.full-merged.json"));
 assert.ok(suite.includes("FIREBASE_DATABASE_EMULATOR_HOST"));
});
