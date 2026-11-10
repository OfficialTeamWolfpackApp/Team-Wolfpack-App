"use strict";
// Synthetic test baseline only. NEVER use as the application's production rules.
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const dir=__dirname;
const synthetic=path.join(dir,"synthetic-original-rules.tmp.json");
if(fs.existsSync(path.join(dir,"database-rules.original.snapshot.json"))||
   fs.existsSync(path.join(dir,"database-rules.full-merged.json")))
 throw new Error("Refusing to overwrite existing reviewed rules fixtures.");
try{
 fs.writeFileSync(synthetic,JSON.stringify({rules:{".read":false,".write":false}},null,2)+"\n",{flag:"wx"});
 const run=spawnSync(process.execPath,[path.join(dir,"prepare-full-rules.js"),synthetic],{stdio:"inherit"});
 if(run.error)throw run.error;
 if(run.status!==0)process.exitCode=run.status||1;
 else console.log("SYNTHETIC ONLY: tests do not validate preservation of production rules.");
}finally{fs.rmSync(synthetic,{force:true});}
