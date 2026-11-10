"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const net=require("node:net");
const dir=__dirname;
const root=path.resolve(dir,"../..");
const project="demo-team-wolfpack-membership-isolated";
const config=JSON.parse(fs.readFileSync(path.join(dir,"firebase.membership-isolated.json"),"utf8"));
const checks=[
 ["Node 24+",Number(process.versions.node.split(".")[0])>=24],
 ["Isolated project ID is demo-only",project.startsWith("demo-")],
 ["Database binds loopback",config.emulators?.database?.host==="127.0.0.1"],
 ["Database port 19012",config.emulators?.database?.port===19012],
 ["Full merged rules selected",config.database?.rules==="membership-backend/emulator/database-rules.full-merged.json"],
 ["Original rules snapshot exists",fs.existsSync(path.join(dir,"database-rules.original.snapshot.json"))],
 ["Merged rules fixture exists",fs.existsSync(path.join(dir,"database-rules.full-merged.json"))],
 ["Rules test dependency installed",fs.existsSync(path.join(dir,"node_modules/@firebase/rules-unit-testing/package.json"))],
 ["No conflicting project environment",!process.env.GCLOUD_PROJECT||process.env.GCLOUD_PROJECT===project]
];
const java=spawnSync("java",["-version"],{cwd:root,encoding:"utf8"});
checks.push(["Java runtime installed",java.status===0]);
const cli=spawnSync("firebase",["--version"],{cwd:root,encoding:"utf8",shell:process.platform==="win32"});
checks.push(["Firebase CLI installed",cli.status===0]);
async function portFree(host,port){
 return new Promise(resolve=>{
  const server=net.createServer();
  server.once("error",()=>resolve(false));
  server.listen({host,port,exclusive:true},()=>server.close(()=>resolve(true)));
 });
}
(async()=>{
 for(const [name,port] of [["Auth emulator port 19109",19109],["Database emulator port 19012",19012]]){
  checks.push([name+" available",await portFree("127.0.0.1",port)]);
 }
 for(const [name,ok] of checks)console.log((ok?"PASS":"BLOCKED")+" "+name);
 if(checks.some(([,ok])=>!ok)){console.error("Preflight incomplete. No emulators started, no writes performed.");process.exitCode=1;}
else console.log("Preflight passed. Tests have NOT been executed; run npm run test:isolated explicitly.");
})().catch(error=>{console.error(error);process.exitCode=1;});
