"use strict";

// Team Wolfpack sponsorship application handler.
// Staged for integration/security review; do not deploy without approval.
// Requires firebase-functions v2 and firebase-admin initialised in functions/index.js.
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { createHash } = require("node:crypto");
const DATABASE_URL = "https://team-wolfpack-app-default-rtdb.europe-west1.firebasedatabase.app";
const ALLOWED_ORIGINS = new Set([
  "https://app.officialteamwolfpack.com",
  "https://officialteamwolfpackapp.github.io"
]);
const MAX_BODY_BYTES = 16000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;

function stringField(value, max, min = 0) {
  if (typeof value !== "string") throw new Error("INVALID_FIELDS");
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new Error("INVALID_FIELDS");
  return clean;
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_FIELDS");
  if (body.websiteTrap) throw new Error("INVALID_FIELDS");
  const allowed = new Set(["type", "fullName", "businessName", "location", "email",
    "website", "bio", "packageId", "sponsorshipInterest", "message",
    "proposedAmountPence", "websiteTrap"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("INVALID_FIELDS");
  const type = stringField(body.type, 20, 1);
  if (!["business", "personal"].includes(type)) throw new Error("INVALID_FIELDS");
  const fullName = stringField(body.fullName, 100, 2);
  const businessName = stringField(body.businessName ?? "", 120);
  if (type === "business" && !businessName) throw new Error("INVALID_FIELDS");
  const location = stringField(body.location, 100, 1);
  const email = stringField(body.email, 254, 5).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_FIELDS");
  const website = stringField(body.website ?? "", 300);
  if (website && !/^https:\/\/[^\s]+$/i.test(website)) throw new Error("INVALID_FIELDS");
  const bio = stringField(body.bio, 1500, 1);
  const packageId = stringField(body.packageId, 80, 1);
  if ((type === "business" && packageId !== "business") ||
      (type === "personal" && !["free", "pack", "loyal", "champion"].includes(packageId))) {
    throw new Error("INVALID_FIELDS");
  }
  const sponsorshipInterest = stringField(body.sponsorshipInterest, 20, 1).toLowerCase();
  if (!["bronze", "silver", "gold", "platinum", "custom"].includes(sponsorshipInterest)) {
    throw new Error("INVALID_FIELDS");
  }
  const message = stringField(body.message ?? "", 1500);
  const amount = body.proposedAmountPence;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 10000000) throw new Error("INVALID_FIELDS");
  // Package IDs are identifiers, not prices. Advertised prices are never accepted from the client.
  return {type, fullName, businessName, location, email, website, bio,
    packageId, sponsorshipInterest, proposedAmountPence: amount, message};
}

exports.submitSponsorshipApplication = onRequest({
  region: "europe-west1",
  maxInstances: 2,
  timeoutSeconds: 30,
  cors: false,
  invoker: "public"
}, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const origin = req.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({error: "ORIGIN_NOT_ALLOWED"});
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Firebase-AppCheck");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({error: "METHOD_NOT_ALLOWED"});
  if (!String(req.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return res.status(415).json({error: "JSON_REQUIRED"});
  }
  if (!Buffer.isBuffer(req.rawBody) || req.rawBody.length > MAX_BODY_BYTES) return res.status(413).json({error: "TOO_LARGE"});
  const appCheckToken = req.get("X-Firebase-AppCheck");
  if (!appCheckToken) return res.status(401).json({error: "APP_CHECK_REQUIRED"});
  try {
    await admin.appCheck().verifyToken(appCheckToken);
  } catch (error) {
    return res.status(401).json({error: "INVALID_APP_CHECK"});
  }
  let data;
  try { data = validate(req.body); }
  catch { return res.status(400).json({error: "INVALID_FIELDS"}); }
  try {
    const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const isolatedProject = "demo-team-wolfpack-profile-images-isolated";
    const isolatedDatabaseHost = "127.0.0.1:19012";
    const functionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    if (functionsEmulator) {
      if (projectId !== isolatedProject) throw new Error("UNEXPECTED_FUNCTIONS_EMULATOR_PROJECT");
      if (emulatorHost !== isolatedDatabaseHost) throw new Error("ISOLATED_DATABASE_EMULATOR_REQUIRED");
    } else if (projectId === isolatedProject) {
      throw new Error("ISOLATED_PROJECT_OUTSIDE_EMULATOR");
    } else if (emulatorHost) {
      throw new Error("UNEXPECTED_DATABASE_EMULATOR_PROJECT");
    }
    const databaseUrl = projectId === isolatedProject
      ? "https://demo-team-wolfpack-profile-images-isolated-default-rtdb.firebaseio.com"
      : DATABASE_URL;
    const db = admin.app().database(databaseUrl);
    // IP-based limits are a basic abuse deterrent; proxy/NAT users may share an IP.
    const ip = req.ip || "unknown";
    const key = createHash("sha256").update(ip).digest("hex");
    const limitRef = db.ref("sponsorshipApplicationLimits").child(key);
    const now = Date.now();
    const limit = await limitRef.transaction((current) => {
      if (!current || !Number.isFinite(current.windowStart) || now - current.windowStart >= WINDOW_MS) {
        return {windowStart: now, count: 1, expiresAt: now + WINDOW_MS};
      }
      if (current.count >= MAX_PER_WINDOW) return;
      return {windowStart: current.windowStart, count: current.count + 1, expiresAt: current.expiresAt};
    }, undefined, false);
    if (!limit.committed) return res.status(429).json({error: "RATE_LIMITED"});
    const applicationRef = db.ref("sponsorshipApplications").push();
    await applicationRef.set({...data, createdAt: now, status: "new"});
    return res.status(201).json({success: true, applicationId: applicationRef.key});
  } catch (error) {
    console.error("Sponsorship application submission failed", error);
    return res.status(500).json({error: "SUBMISSION_FAILED"});
  }
});
