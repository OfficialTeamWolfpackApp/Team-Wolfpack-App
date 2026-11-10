"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=__dirname;
const modules=[
 "submit-membership-application","admin-membership-review","public-membership",
 "admin-membership-renewal","admin-renewal-alerts",
 "membership-reminder-outbox","reminder-preferences"
];
test("all seven callable modules use Firebase Functions v2 and Admin SDK",()=>{
 for(const name of modules){
  const source=fs.readFileSync(path.join(root,name+".js"),"utf8");
  assert.match(source,/firebase-functions\/v2\/https/,name);
  assert.match(source,/firebase-admin\/database/,name);
  assert.match(source,/enforceAppCheck\s*:\s*true/,name);
  assert.match(source,/region\s*:\s*["']europe-west1["']/,name);
 }
});
test("registry imports every callable module from local backend directory",()=>{
 const source=fs.readFileSync(path.join(root,"staging-function-registry.js"),"utf8");
 for(const name of modules)assert.ok(source.includes('"./'+name+'"'),name);
});
test("production Functions entrypoint must not be silently assumed to be integrated",()=>{
 const manifest=fs.readFileSync(path.join(root,"STAGING-PACKAGE-MANIFEST.md"),"utf8");
 assert.match(manifest,/NOT DEPLOYED/);
 assert.match(manifest,/functions\/index\.js/);
});
