"use strict";

/** Public, minimal membership display. No email, payment, or administrator data. */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {isActive}=require("./membership-entitlements");
const LABELS=Object.freeze({
  personal:Object.freeze({free:"FREE PACK MEMBER",bronze:"BRONZE SUPPORTER",silver:"SILVER SUPPORTER",gold:"GOLD SUPPORTER",vip:"WOLFPACK VIP"}),
  business:Object.freeze({bronze:"BRONZE SPONSOR",silver:"SILVER SPONSOR",gold:"GOLD SPONSOR",platinum:"PLATINUM SPONSOR"})
});
const getPublicMembership=onCall({region:"europe-west1",enforceAppCheck:true,maxInstances:5},async request=>{
  const uid=request.data?.uid;
  if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{10,128}$/.test(uid)){
    throw new HttpsError("invalid-argument","Invalid profile identifier");
  }
  const db=getDatabase();
  const profile=await db.ref("publicSupporterProfiles/"+uid).get();
  if(!profile.exists())return {visible:false};
  const snapshot=await db.ref("membershipEntitlements/"+uid).get();
  const entitlement=snapshot.val();
  if(!isActive(entitlement))return {visible:true,type:"personal",tier:"free",label:"FREE PACK MEMBER",expiresAt:null};
  const label=LABELS[entitlement.type]?.[entitlement.tier];
  if(!label)return {visible:true,type:"personal",tier:"free",label:"FREE PACK MEMBER",expiresAt:null};
  return {visible:true,type:entitlement.type,tier:entitlement.tier,label,expiresAt:entitlement.expiresAt};
});
module.exports={getPublicMembership};
