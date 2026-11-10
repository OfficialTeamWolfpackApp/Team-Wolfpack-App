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
const {randomUUID}=require("node:crypto");

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
  // Transaction callbacks may run more than once; identity must be stable.
  const renewalId=randomUUID();
  const result=await renewalRef.transaction(current=>{
    if(current && ["awaiting_payment","payment_verified"].includes(current.status))return;
    return {applicantUid:uid,type:existing.type,tier,
      pricePence:PACKAGES[existing.type][tier],currency:"GBP",
      paymentReference:reference,status:"awaiting_payment",
      paymentStatus:"unverified",requestedBy:request.auth.uid,
      requestedAt:now,renewalId};
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
 * Idempotent activation. The canonical renewal ledger and entitlement are
 * committed in ONE transaction on the per-user account node. A legacy
 * projection to membershipEntitlements is separate and safely retryable.
 * A production migration must reconcile any older entitlement records.
 */
const activateMembershipRenewal=onCall(options,async request=>{
  requireAdmin(request);
  const uid=request.data?.applicantUid;
  if(typeof uid!=="string"||!uidPattern.test(uid)){
    throw new HttpsError("invalid-argument","Invalid account.");
  }
  const db=getDatabase();
  const requestRef=db.ref("membershipRenewalRequests/"+uid);
  const pending=(await requestRef.get()).val();
  if(!pending || typeof pending.renewalId!=="string" ||
     !/^[0-9a-f-]{36}$/i.test(pending.renewalId) ||
     pending.applicantUid!==uid ||
     !["payment_verified","active"].includes(pending.status) ||
     pending.paymentStatus!=="verified" ||
     typeof pending.paymentVerifiedBy!=="string" ||
     !ADMIN_UIDS.has(pending.paymentVerifiedBy) ||
     !Number.isSafeInteger(pending.paymentVerifiedAt) ||
     pending.paymentVerifiedAt<=0 ||
     !Number.isSafeInteger(pending.requestedAt) ||
     pending.requestedAt<=0 ||
     pending.paymentVerifiedAt<pending.requestedAt ||
     !Object.hasOwn(PACKAGES,pending.type) ||
     !Object.hasOwn(PACKAGES[pending.type],pending.tier) ||
     PACKAGES[pending.type][pending.tier]===0 ||
     pending.pricePence!==PACKAGES[pending.type][pending.tier]){
    throw new HttpsError("failed-precondition","No valid verified renewal is ready.");
  }
  const ledgerRef=db.ref("membershipAccounts/"+uid);
  const legacy=(await db.ref("membershipEntitlements/"+uid).get()).val();
  const now=Date.now();
  const result=await ledgerRef.transaction(current=>{
    const account=current||{};
    const history=account.history||{};
    if(history[pending.renewalId])return;
    // Fail closed if another renewal was already activated in this account
    // since this request was created.
    const previous=account.entitlement||legacy;
    if(previous && previous.approvedAt>pending.requestedAt)return;
    const approval={...pending,status:"active",approvedAt:now,approvedBy:request.auth.uid};
    let entitlement;
    try{entitlement=buildRenewal(previous,approval);}
    catch(_){return;}
    entitlement.renewalId=pending.renewalId;
    return {...account,entitlement,history:{
      ...history,[pending.renewalId]:{
        renewalId:pending.renewalId,type:entitlement.type,tier:entitlement.tier,
        pricePence:entitlement.pricePence,currency:"GBP",
        startsAt:entitlement.startsAt,expiresAt:entitlement.expiresAt,
        approvedAt:now,approvedBy:request.auth.uid,
        paymentVerifiedAt:pending.paymentVerifiedAt,
        paymentVerifiedBy:pending.paymentVerifiedBy
      }
    }};
  },undefined,false);
  const account=result.snapshot.val()||{};
  if(!account.history?.[pending.renewalId]){
    throw new HttpsError("failed-precondition","Renewal activation was not committed.");
  }
  // The account ledger is authoritative. Projection is deliberately retried
  // on subsequent calls if a prior projection failed.
  const entitlement=account.entitlement;
  if(entitlement?.renewalId!==pending.renewalId){
    throw new HttpsError("failed-precondition","A newer membership is already active.");
  }
  const projectionRef=db.ref("membershipEntitlements/"+uid);
  const projection=await projectionRef.transaction(current=>{
    if(current?.renewalId===pending.renewalId)return;
    // Equal timestamps are not sufficient to prove the same approval.
    // Never overwrite a newer or ambiguous projection.
    if(current && (!Number.isSafeInteger(current.approvedAt) ||
       current.approvedAt>=entitlement.approvedAt))return;
    return entitlement;
  },undefined,false);
  if(!projection.committed &&
     projection.snapshot.val()?.renewalId!==pending.renewalId){
    throw new HttpsError("internal","Renewal saved but public projection needs reconciliation.");
  }
  await requestRef.transaction(current=>{
    if(!current || current.renewalId!==pending.renewalId ||
       !["payment_verified","active"].includes(current.status))return;
    return {...current,status:"active",activatedAt:entitlement.approvedAt,
      activatedBy:entitlement.approvedBy};
  },undefined,false);
  return {success:true,status:"active",expiresAt:entitlement.expiresAt,
    renewalId:pending.renewalId};
});
module.exports={
  requestMembershipRenewal,verifyMembershipRenewalPayment,
  activateMembershipRenewal
};
