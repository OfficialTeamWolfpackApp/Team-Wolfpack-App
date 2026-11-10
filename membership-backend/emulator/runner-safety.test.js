"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

test("isolated runner refuses to start without reviewed database rules fixtures",()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"wolfpack-emulator-guard-"));
 try{
  const dir=path.join(temporary,"membership-backend","emulator");
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,"run-isolated-tests.js"),path.join(dir,"run-isolated-tests.js"));
  // No fixtures or Firebase executable are supplied. The runner must fail before starting an emulator.
  const run=spawnSync(process.execPath,[path.join(dir,"run-isolated-tests.js")],{
   cwd:temporary,
   env:{...process.env,GCLOUD_PROJECT:"demo-team-wolfpack-membership-isolated"},
   encoding:"utf8",
   timeout:5000
  });
  assert.equal(run.status,1,"Runner must fail closed without reviewed rules");
  assert.match(run.stderr,/Full merged and original rules fixtures required/);
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
