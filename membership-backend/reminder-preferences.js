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
  await getDatabase().ref("membershipReminderPreferences/"+uid).set(next);
  return {success:true,...next,deliveryEnabled:false};
});
module.exports={getMembershipReminderPreferences,saveMembershipReminderPreferences};
