"use strict";

// STEP 27 — staging-only export registry.
// Copy this file together with the entire membership-backend directory into
// the REAL Firebase functions/ directory, then merge these exports into index.js.
// This is NOT automatically loaded by Firebase and does not deploy anything.
const modules = [
  "./submit-membership-application",
  "./admin-membership-review",
  "./public-membership",
  "./admin-membership-renewal",
  "./admin-renewal-alerts",
  "./membership-reminder-outbox",
  "./reminder-preferences"
];
const allowed = new Set([
  "submitMembershipApplication", "reviewMembershipApplication",
  "listMembershipApplications", "getPublicMembership",
  "requestMembershipRenewal", "verifyMembershipRenewalPayment",
  "activateMembershipRenewal", "listMembershipRenewalAlerts",
  "queueMembershipRenewalReminders",
  "getMembershipReminderPreferences", "saveMembershipReminderPreferences"
]);
function registerMembershipExports(target) {
  if (!target || typeof target !== "object") throw new TypeError("Invalid exports target");
  for (const modulePath of modules) {
    const moduleExports = require(modulePath);
    for (const [name, fn] of Object.entries(moduleExports)) {
      if (!allowed.has(name)) continue; // do not publish pure helpers as endpoints
      if (Object.prototype.hasOwnProperty.call(target, name)) {
        throw new Error("Duplicate Firebase function export: " + name);
      }
      target[name] = fn;
    }
  }
  if ([...allowed].some(name => typeof target[name] !== "function")) {
    throw new Error("Missing membership function export");
  }
  return target;
}
module.exports = {registerMembershipExports};
