"use strict";
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const options={region:"europe-west1",enforceAppCheck:true,maxInstances:3};
function requireUser(request){
  if(!request.auth?.uid || !request.auth.token?.email_verified)
    throw new HttpsError("unauthenticated","Verified account required.");
  return request.auth.uid;
}
const getMembershipReminderPreferences=onCall(options,async request=>{
  const uid=requireUser(request);
  const snap=await getDatabase().ref("membershipReminderPreferences/"+uid).get();
  const saved=snap.val()||{};
  return {membershipRenewalReminders:saved.membershipRenewalReminders===true,
    email:saved.email===true,push:saved.push===true,
    updatedAt:Number.isSafeInteger(saved.updatedAt)?saved.updatedAt:null};
});
const saveMembershipReminderPreferences=onCall(options,async request=>{
  const uid=requireUser(request);
  const data=request.data;
  if(!data||typeof data!=="object"||
     typeof data.membershipRenewalReminders!=="boolean"||
     typeof data.email!=="boolean"||typeof data.push!=="boolean"){
    throw new HttpsError("invalid-argument","All reminder preferences must be explicit booleans.");
  }
  const enabled=data.membershipRenewalReminders;
  const next={membershipRenewalReminders:enabled,
    email:enabled&&data.email,push:enabled&&data.push,
    updatedAt:Date.now()};
  const db=getDatabase();
  // Store preferences before touching the queue so a future dispatcher that
  // rechecks consent will fail closed immediately after an opt-out.
  await db.ref("membershipReminderPreferences/"+uid).set(next);
  let cancelled=0;
  const queued=await db.ref("membershipReminderOutbox/"+uid).get();
  for(const [key,item] of Object.entries(queued.val()||{})){
    if(!/^[0-9]+_(30|14|7)$/.test(key)||item?.status!=="queued")continue;
    const permitted=next.membershipRenewalReminders &&
      ((next.email&&item.allowedChannels?.includes("email"))||
       (next.push&&item.allowedChannels?.includes("push")));
    if(permitted)continue;
    const result=await db.ref("membershipReminderOutbox/"+uid+"/"+key)
      .transaction(current=>{
        if(!current||current.status!=="queued")return;
        return {...current,status:"cancelled",cancelledAt:Date.now(),
          cancellationReason:"preferences_changed"};
      },undefined,false);
    if(result.committed)cancelled++;
  }
  return {success:true,...next,cancelled,deliveryEnabled:false};
});
module.exports={getMembershipReminderPreferences,saveMembershipReminderPreferences};
