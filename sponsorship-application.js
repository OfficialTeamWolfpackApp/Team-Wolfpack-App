"use strict";

// Team Wolfpack sponsorship form - prepared integration.
// Keep submissions disabled until backend, database rules, and App Check have been tested.
const SPONSORSHIP_SUBMISSIONS_ENABLED = false;
const SPONSORSHIP_FUNCTION_URL = ""; // Set to the verified deployed HTTPS endpoint only.
const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyC06RDrqpXodbYBJqyeGvRkmtxQGapaaPY",
  authDomain: "team-wolfpack-app.firebaseapp.com",
  projectId: "team-wolfpack-app",
  appId: "1:1070414578856:web:df14e7d387e658eeae2e9d"
});
const APP_CHECK_SITE_KEY = "6LfYlcItAAAAAGQtEJFKYH6fyERwXiAfVeBqJhOR";

const form = document.getElementById("applicationForm");
const type = document.getElementById("type");
const pack = document.getElementById("package");
const businessLabel = document.getElementById("businessLabel");
const submitButton = document.getElementById("submitBtn");
const status = document.getElementById("formStatus");
let submitting = false;
let appCheckPromise;

function updatePackages() {
  pack.replaceChildren(new Option("Select a package", ""));
  const options = type.value === "personal"
    ? [
      ["pack", "Pack Supporter — £10/year (proposed)"],
      ["loyal", "Loyal Supporter — £25/year (proposed)"],
      ["champion", "Wolfpack Champion — £50/year (proposed)"]
    ]
    : type.value === "business"
      ? [["business", "Business Sponsorship — by arrangement"]]
      : [];
  for (const [value, label] of options) pack.add(new Option(label, value));
  businessLabel.style.display = type.value === "personal" ? "none" : "block";
  businessLabel.querySelector("input").required = type.value === "business";
}

function poundsToPence(value) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  // Decimal strings are converted without floating-point rounding.
  if (!/^(?:0|[1-9]\\d{0,5})(?:\\.\\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid annual contribution with no more than two decimal places.");
  }
  const [pounds, pennies = ""] = trimmed.split(".");
  const amount = Number(pounds) * 100 + Number(pennies.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 10000000) {
    throw new Error("The proposed contribution must be £100,000 or less.");
  }
  return amount;
}

function applicationPayload() {
  const values = new FormData(form);
  const applicationType = String(values.get("type") || "");
  const packageId = String(values.get("package") || "");
  if (applicationType === "business" && packageId !== "business" ||
      applicationType === "personal" && !["pack", "loyal", "champion"].includes(packageId)) {
    throw new Error("Choose a valid sponsorship package.");
  }
  return {
    type: applicationType,
    fullName: String(values.get("fullName") || "").trim(),
    businessName: applicationType === "business" ? String(values.get("businessName") || "").trim() : "",
    location: String(values.get("location") || "").trim(),
    email: String(values.get("email") || "").trim(),
    website: String(values.get("website") || "").trim(),
    packageId,
    proposedAmountPence: poundsToPence(String(values.get("contribution") || "")),
    bio: String(values.get("bio") || "").trim(),
    message: String(values.get("message") || "").trim(),
    websiteTrap: String(values.get("websiteTrap") || "")
  };
}

async function appCheckToken() {
  if (!appCheckPromise) {
    appCheckPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js")
    ]).then(([firebase, appCheck]) => {
      const app = firebase.getApps().length ? firebase.getApp() : firebase.initializeApp(FIREBASE_CONFIG);
      return {appCheck, instance: appCheck.initializeAppCheck(app, {
        provider: new appCheck.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      })};
    }).catch(error => { appCheckPromise = undefined; throw error; });
  }
  const {appCheck, instance} = await appCheckPromise;
  const result = await appCheck.getToken(instance);
  return result.token;
}

function setStatus(message) {
  status.textContent = message;
}

type.addEventListener("change", updatePackages);
updatePackages();

// The HTML button remains disabled unless the explicit feature flag and endpoint are configured.
if (SPONSORSHIP_SUBMISSIONS_ENABLED && /^https:\/\//.test(SPONSORSHIP_FUNCTION_URL)) {
  submitButton.disabled = false;
  submitButton.textContent = "SUBMIT APPLICATION";
  setStatus("This is an enquiry only. No payment will be taken.");
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!SPONSORSHIP_SUBMISSIONS_ENABLED || !/^https:\/\//.test(SPONSORSHIP_FUNCTION_URL) || submitting) return;
  if (!form.reportValidity()) return;
  submitting = true;
  submitButton.disabled = true;
  setStatus("Submitting your application securely...");
  try {
    const payload = applicationPayload();
    const token = await appCheckToken();
    const response = await fetch(SPONSORSHIP_FUNCTION_URL, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: {"Content-Type": "application/json", "X-Firebase-AppCheck": token},
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      if (response.status === 429) throw new Error("Too many applications have been sent. Please try again later.");
      throw new Error("Your application could not be submitted. Please try again later.");
    }
    form.reset();
    updatePackages();
    setStatus("Application received. Team Wolfpack will review your enquiry.");
  } catch (error) {
    setStatus(error.message || "Unable to submit your application. Please try again.");
  } finally {
    submitting = false;
    submitButton.disabled = false;
  }
});
