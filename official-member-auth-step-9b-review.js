"use strict";

const admin = require("firebase-admin");
const {onRequest} = require("firebase-functions/v2/https");
const {onValueWritten} = require("firebase-functions/v2/database");

const ALLOWED_SLUGS = new Set([
  "mr-wolfie", "mrs-wolfie", "greig-sloan", "bry-kelly",
  "billy-burton", "kelly-mcsporran", "richard-davies",
]);
const ORIGINS = new Set([
  "https://app.officialteamwolfpack.com",
  "https://officialteamwolfpackapp.github.io",
]);

/**
 * Gets the official team member profiles linked to a user.
 *
 * @param {string} uid Firebase Authentication user ID.
 * @return {Promise<string[]>} Linked team member profile slugs.
 */
async function getLinkedSlugs(uid) {
  const snapshot = await admin.database().ref("officialTeamAccountLinks").get();
  const links = snapshot.val() || {};
  return Object.entries(links)
      .filter(
          ([slug, linkedUid]) =>
            ALLOWED_SLUGS.has(slug) && linkedUid === uid,
      )
      .map(([slug]) => slug);
}

/**
 * Synchronises official member status with Firebase Authentication.
 *
 * @param {string} uid Firebase Authentication user ID.
 * @return {Promise<Object>} Official member claim status.
 */
async function syncClaim(uid) {
  const slugs = await getLinkedSlugs(uid);
  const user = await admin.auth().getUser(uid);
  const existing = user.customClaims || {};
  const shouldBeOfficial = slugs.length > 0 && user.emailVerified === true && !user.disabled;
  if (existing.officialMember !== shouldBeOfficial) {
    const next = {...existing};
    if (shouldBeOfficial) next.officialMember = true;
    else delete next.officialMember;
    await admin.auth().setCustomUserClaims(uid, next);
  }
  return {officialMember: shouldBeOfficial};
}

// Called by a verified signed-in member to synchronise existing links.
exports.syncOfficialMemberClaim = onRequest(
    {region: "europe-west1", maxInstances: 2},
    async (request, response) => {
      const origin = request.get("Origin");
      if (origin && ORIGINS.has(origin)) {
        response.set("Access-Control-Allow-Origin", origin);
        response.set("Vary", "Origin");
      }
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type",
      );
      if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
      }
      if (request.method !== "POST") {
        response.status(405).json({error: "METHOD_NOT_ALLOWED"});
        return;
      }
      if (origin && !ORIGINS.has(origin)) {
        response.status(403).json({error: "ORIGIN_NOT_ALLOWED"});
        return;
      }
      const bearer = request.get("Authorization") || "";
      if (!bearer.startsWith("Bearer ")) {
        response.status(401).json({error: "AUTH_REQUIRED"});
        return;
      }
      try {
        const token = await admin.auth().verifyIdToken(bearer.slice(7), true);
        if (token.email_verified !== true) {
          response.status(403).json({error: "VERIFIED_EMAIL_REQUIRED"});
          return;
        }
        const result = await syncClaim(token.uid);
        response.status(200).json({success: true, ...result});
      } catch (error) {
        if (error.code === "auth/argument-error" ||
            error.code === "auth/id-token-expired" ||
            error.code === "auth/id-token-revoked" ||
            error.code === "auth/user-disabled" ||
            error.code === "auth/user-not-found") {
          response.status(401).json({error: "INVALID_AUTH_TOKEN"});
          return;
        }
        console.error("Official member claim sync failed:", error);
        response.status(500).json({error: "CLAIM_SYNC_FAILED"});
      }
    },
);

// Keep claims in sync when administrators add, replace or remove account links.
exports.syncOfficialMemberLink = onValueWritten(
    {
      ref: "/officialTeamAccountLinks/{slug}",
      region: "europe-west1",
      instance: "team-wolfpack-app-default-rtdb",
    },
    async (event) => {
      if (!ALLOWED_SLUGS.has(event.params.slug)) return;
      const before = event.data.before.val();
      const after = event.data.after.val();
      const affected = [...new Set([before, after].filter(
          (value) => typeof value === "string" && value.length > 0))];
      for (const uid of affected) {
        try {
          await syncClaim(uid);
        } catch (error) {
          if (error.code === "auth/user-not-found") continue;
          throw error;
        }
      }
    },
);
