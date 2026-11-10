"use strict";

/**
 * Admin-only renewal recording for Firebase Functions v2.
 * Integration draft: must be registered in the existing deployed Functions
 * project, reviewed against production rules, and emulator-tested.
 *
 * Renewals are separate from the initial intake record. Every successful
 * renewal is written to a permanent per-user history entry, with a stable
 * renewal ID. Never delete supporter profiles or earned badges.
 */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {buildRenewal}=require("./membership-renewal");
const {PACKAGES}=require("./membership-policy");

const ADMIN_UIDS=new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
const options={region:"europe-west1",enforceAppCheck:true,maxInstances:3};
const uidPattern=/^[A-Za-z0-9_-]{1,128}$/;
function requireAdmin(request){
  if(!request.auth || !ADMIN_UIDS.has(request.auth.uid)){
    throw new HttpsError("permission-denied","Administrator access required.");
  }
}
function validateRequest(data){
  const uid=data?.applicantUid;
  if(typeof uid!=="string"||!uidPattern.test(uid)){
    throw new HttpsError("invalid-argument","Invalid account identifier.");
  }
  const tier=data?.tier;
  if(typeof tier!=="string"||tier.length>32){
    throw new HttpsError("invalid-argument","Invalid membership tier.");
  }
  const reference=data?.paymentReference;
  // Record a non-sensitive reference only; never store card/bank details.
  if(typeof reference!=="string"||!/^[A-Za-z0-9 _./-]{3,80}$/.test(reference)){
    throw new HttpsError("invalid-argument","A non-sensitive payment reference is required.");
  }
  return {uid,tier,reference:reference.trim()};
}

/**
 * A manual renewal request creates a PENDING record only. No payment is
 * marked verified and no entitlement is changed by this callable.
 */
const requestMembershipRenewal=onCall(options,async request=>{
  requireAdmin(request);
  const {uid,tier,reference}=validateRequest(request.data);
  const db=getDatabase();
  const existing=(await db.ref("membershipEntitlements/"+uid).get()).val();
  if(!existing || !PACKAGES[existing.type] ||
     !Object.hasOwn(PACKAGES[existing.type],tier) ||
     PACKAGES[existing.type][tier]===0){
    throw new HttpsError("failed-precondition","No eligible paid membership.");
  }
  const now=Date.now();
  const renewalRef=db.ref("membershipRenewalRequests/"+uid);
  const result=await renewalRef.transaction(current=>{
    if(current && ["awaiting_payment","payment_verified"].includes(current.status))return;
    return {applicantUid:uid,type:existing.type,tier,
      pricePence:PACKAGES[existing.type][tier],currency:"GBP",
      paymentReference:reference,status:"awaiting_payment",
      paymentStatus:"unverified",requestedBy:request.auth.uid,
      requestedAt:now};
  },undefined,false);
  if(!result.committed)throw new HttpsError("already-exists","A renewal is already pending.");
  return {success:true,status:"awaiting_payment"};
});

/**
 * Verifies payment as an explicit admin action. It does not activate.
 * This must be invoked only after independent confirmation of funds.
 */
const verifyMembershipRenewalPayment=onCall(options,async request=>{
  requireAdmin(request);
  const uid=request.data?.applicantUid;
  if(typeof uid!=="string"||!uidPattern.test(uid))throw new HttpsError("invalid-argument","Invalid account.");
  if(request.data?.confirmedReceived!==true){
    throw new HttpsError("failed-precondition","Explicit confirmation of funds received is required.");
  }
  const ref=getDatabase().ref("membershipRenewalRequests/"+uid);
  const now=Date.now();
  const result=await ref.transaction(current=>{
    if(!current || current.status!=="awaiting_payment" ||
       current.paymentStatus!=="unverified")return;
    return {...current,status:"payment_verified",paymentStatus:"verified",
      paymentVerifiedBy:request.auth.uid,paymentVerifiedAt:now};
  },undefined,false);
  if(!result.committed)throw new HttpsError("failed-precondition","Renewal is not awaiting payment.");
  return {success:true,status:"payment_verified"};
});

/**
 * Activation is intentionally not exposed yet. A safe production activation
 * requires an idempotent history write and entitlement update with recovery
 * for partial failures. Never approve by editing the database from a client.
 */
module.exports={requestMembershipRenewal,verifyMembershipRenewalPayment};
