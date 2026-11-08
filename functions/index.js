"use strict";

// Team Wolfpack Firebase Functions entry point.
// This branch currently contains the sponsorship function only.
// Existing production functions must be merged deliberately before deployment.
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.submitSponsorshipApplication =
  require("./submit-sponsorship-application").submitSponsorshipApplication;
