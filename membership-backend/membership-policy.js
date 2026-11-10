"use strict";

/**
 * Team Wolfpack membership policy — pure server-side validation helpers.
 * This module does NOT grant membership or verify payment.
 * Deploy only as part of an authenticated Firebase Cloud Function.
 */
const PACKAGES = Object.freeze({
  personal: Object.freeze({free:0,bronze:1000,silver:2000,gold:3500,vip:5000}),
  business: Object.freeze({bronze:5000,silver:10000,gold:20000,platinum:35000})
});
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MAX = Object.freeze({fullName:100,businessName:120,location:100,email:254,website:300,bio:1500,message:1500});
function plainString(value, field, required = false) {
  if (typeof value !== "string") throw new TypeError(field + " must be text");
  const v = value.trim();
  if (v.length > MAX[field]) throw new RangeError(field + " is too long");
  if (required && !v) throw new Error(field + " is required");
  return v;
}
function validateApplication(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid application");
  const type = input.type;
  if (!Object.prototype.hasOwnProperty.call(PACKAGES,type)) throw new Error("Invalid application type");
  const tier = input.package;
  if (!Object.prototype.hasOwnProperty.call(PACKAGES[type],tier)) throw new Error("Invalid membership package");
  const fullName = plainString(input.fullName,"fullName",true);
  const businessName = plainString(input.businessName ?? "","businessName",type==="business");
  const location = plainString(input.location,"location",true);
  const email = plainString(input.email,"email",true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
  const website = plainString(input.website ?? "","website");
  if (website) {
    let url;
    try { url = new URL(website); } catch { throw new Error("Invalid website URL"); }
    if (!["https:","http:"].includes(url.protocol)) throw new Error("Website must use HTTP or HTTPS");
  }
  const bio = plainString(input.bio,"bio",true);
  const message = plainString(input.message ?? "","message");
  // Never accept client-supplied price, payment confirmation, role, dates or status.
  return {type,tier,pricePence:PACKAGES[type][tier],currency:"GBP",fullName,businessName,location,email,website,bio,message};
}
function calculateExpiry(approvedAtMs) {
  if (!Number.isSafeInteger(approvedAtMs) || approvedAtMs < 0) throw new Error("Invalid approval time");
  const d = new Date(approvedAtMs);
  if (!Number.isFinite(d.getTime())) throw new Error("Invalid approval time");
  d.setUTCFullYear(d.getUTCFullYear()+1);
  return d.getTime();
}
function assertAdmin(claims) {
  // Server must independently verify Firebase ID token and custom admin claim.
  if (!claims || claims.admin !== true) throw new Error("Administrator permission required");
}
module.exports={PACKAGES,validateApplication,calculateExpiry,assertAdmin};
