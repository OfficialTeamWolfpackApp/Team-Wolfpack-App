"use strict";

/**
 * Firebase Functions v2 callable entry point.
 *
 * Integration (in the existing functions/index.js):
 *   exports.submitMembershipApplication =
 *     require("./membership-backend/submit-membership-application")
 *       .submitMembershipApplication;
 *
 * Copy this module and membership-policy.js into the deployed Functions source
 * before integrating. Do NOT deploy it from this static website repository.
 */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {validateApplication}=require("./membership-policy");

const MIN_RESUBMIT_MS=24*60*60*1000;
const MAX_PAYLOAD_BYTES=8192;
const submitMembershipApplication=onCall(
  {region:"europe-west1",enforceAppCheck:true,maxInstances:5},
  async request=>{
    const auth=request.auth;
    if(!auth?.uid)throw new HttpsError("unauthenticated","Sign in before applying.");
    if(auth.token.email_verified!==true || typeof auth.token.email!=="string"){
      throw new HttpsError("permission-denied","Verify your email before applying.");
    }
    if(auth.token.officialMember===true){
      throw new HttpsError("permission-denied","Official team accounts cannot apply as supporters.");
    }
    let application;
    try {
      if(Buffer.byteLength(JSON.stringify(request.data??null),"utf8")>MAX_PAYLOAD_BYTES){
        throw new Error("Application is too large");
      }
      application=validateApplication(request.data);
      if(application.email!==auth.token.email.toLowerCase()){
        throw new Error("Application email must match your verified account email");
      }
    }catch(error){
      throw new HttpsError("invalid-argument",error.message);
    }
    const uid=auth.uid;
    // Firebase Auth UIDs are safe path segments, but reject malformed values.
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)){
      throw new HttpsError("permission-denied","Invalid account identifier.");
    }
    const now=Date.now();
    const applicationRef=getDatabase().ref("membershipApplicationIntake/"+uid);
    let result;
    try{
      result=await applicationRef.transaction(current=>{
        if(current && (["awaiting_payment","payment_verified","active"].includes(current.status) ||
          (typeof current.submittedAt==="number" &&
          now-current.submittedAt<MIN_RESUBMIT_MS)))return;
        // Status and price are determined on the server. This is NOT approval.
        return {
          ...application,
          applicantUid:uid,
          submittedAt:now,
          status:"new",
          paymentStatus:"unverified",
          approvedAt:null,
          expiresAt:null
        };
      },undefined,false);
    }catch(error){
      console.error("Membership application write failed",error);
      throw new HttpsError("internal","Unable to submit application.");
    }
    if(!result.committed){
      throw new HttpsError("resource-exhausted","An application is already pending or active, or you must wait 24 hours before reapplying.");
    }
    return {success:true,status:"new"};
  }
);
module.exports={submitMembershipApplication};
