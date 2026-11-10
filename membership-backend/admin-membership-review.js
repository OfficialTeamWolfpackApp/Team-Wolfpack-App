"use strict";

/**
 * Draft callable administrator workflow for Firebase Functions v2.
 * Integrate into the existing Functions project only after reviewing the
 * deployed authentication claims and Realtime Database rules.
 *
 * This file does not deploy itself or modify production data.
 */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {PACKAGES,calculateExpiry}=require("./membership-policy");

const ADMIN_UIDS=new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
const ACTIONS=new Set(["mark_awaiting_payment","verify_payment","decline","activate"]);
const callableOptions={region:"europe-west1",enforceAppCheck:true,maxInstances:3};

function requireAdmin(request){
  if(!request.auth || !ADMIN_UIDS.has(request.auth.uid)){
    throw new HttpsError("permission-denied","Administrator access required.");
  }
}
function validateUid(uid){
  if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)){
    throw new HttpsError("invalid-argument","Invalid applicant account.");
  }
  return uid;
}
function validateAction(action){
  if(!ACTIONS.has(action))throw new HttpsError("invalid-argument","Invalid review action.");
  return action;
}
function transition(record,action,adminUid,now){
  if(!record || typeof record!=="object")throw new Error("Application not found");
  if(!["personal","business"].includes(record.type) ||
    !Object.prototype.hasOwnProperty.call(PACKAGES[record.type],record.tier) ||
    record.pricePence!==PACKAGES[record.type][record.tier]){
    throw new Error("Application package data failed validation");
  }
  const current=record.status;
  if(action==="mark_awaiting_payment" && current==="new"){
    return {...record,status:"awaiting_payment",reviewedBy:adminUid,reviewedAt:now};
  }
  if(action==="verify_payment" && current==="awaiting_payment" &&
     record.pricePence>0 && record.paymentStatus==="unverified"){
    return {...record,status:"payment_verified",paymentStatus:"verified",
      paymentVerifiedBy:adminUid,paymentVerifiedAt:now};
  }
  if(action==="decline" && ["new","awaiting_payment"].includes(current)){
    return {...record,status:"declined",reviewedBy:adminUid,reviewedAt:now};
  }
  if(action==="activate" && (
    (current==="payment_verified" && record.paymentStatus==="verified") ||
    (current==="new" && record.type==="personal" && record.tier==="free" && record.pricePence===0)
  )){
    return {...record,status:"active",approvedBy:adminUid,approvedAt:now,
      expiresAt:calculateExpiry(now)};
  }
  throw new Error("Action is not allowed from this application state");
}

const reviewMembershipApplication=onCall(callableOptions,async request=>{
  requireAdmin(request);
  const uid=validateUid(request.data?.applicantUid);
  const action=validateAction(request.data?.action);
  const ref=getDatabase().ref("membershipApplicationIntake/"+uid);
  const now=Date.now();
  let outcome;
  try{
    outcome=await ref.transaction(current=>{
      if(!current)return;
      try{return transition(current,action,request.auth.uid,now);}
      catch{return;}
    },undefined,false);
  }catch(error){
    console.error("Membership review failed",error);
    throw new HttpsError("internal","Unable to review application.");
  }
  if(!outcome.committed){
    throw new HttpsError("failed-precondition","Application not found or action is not permitted.");
  }
  // An active application record is NOT by itself a public entitlement.
  // Entitlement projection, renewal and badge display require separate
  // backend integration and must not trust client-side status.
  return {success:true,status:outcome.snapshot.val().status};
});

const listMembershipApplications=onCall(callableOptions,async request=>{
  requireAdmin(request);
  const snapshot=await getDatabase().ref("membershipApplicationIntake")
    .orderByChild("submittedAt").limitToLast(100).get();
  const entries=Object.entries(snapshot.val()||{}).map(([uid,value])=>({
    applicantUid:uid,
    type:value.type,tier:value.tier,fullName:value.fullName,
    businessName:value.businessName,email:value.email,
    pricePence:value.pricePence,currency:value.currency,
    status:value.status,paymentStatus:value.paymentStatus,
    submittedAt:value.submittedAt,paymentVerifiedAt:value.paymentVerifiedAt||null,
    approvedAt:value.approvedAt||null,expiresAt:value.expiresAt||null
  }));
  return {applications:entries.reverse()};
});
module.exports={reviewMembershipApplication,listMembershipApplications};
