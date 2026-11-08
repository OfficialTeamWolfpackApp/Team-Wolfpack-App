// Team Wolfpack sponsorship admin dashboard.
// PREVIEW ONLY: do not enable until RTDB rules have been merged and tested.
const ENABLE_SPONSORSHIP_ADMIN_READS = false;
const ADMIN_UIDS = new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
const firebaseConfig = {
  apiKey: "AIzaSyC06RDrqpXodbYBJqyeGvRkmtxQGapaaPY",
  authDomain: "team-wolfpack-app.firebaseapp.com",
  databaseURL: "https://team-wolfpack-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "team-wolfpack-app",
  appId: "1:1070414578856:web:df14e7d387e658eeae2e9d"
};

const access = document.getElementById("sponsorshipAdminAccess");
const list = document.getElementById("sponsorshipApplications");
const stats = document.querySelectorAll(".stat .num");
const filters = document.getElementById("sponsorshipFilters");
let applications = [];
let selectedFilter = "all";

function showStatus(message) { access.textContent = message; }
function cell(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value == null ? "—" : String(value);
  if (className) element.className = className;
  return element;
}
function dateLabel(timestamp) {
  if (!Number.isFinite(timestamp)) return "Unknown date";
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-GB") : "Unknown date";
}
function render() {
  const all = applications;
  stats[0].textContent = String(all.length);
  stats[1].textContent = String(all.filter(a => a.status === "new").length);
  stats[2].textContent = String(all.filter(a => a.status === "in_progress").length);
  stats[3].textContent = String(all.filter(a => a.status === "completed").length);
  const visible = all.filter(a => selectedFilter === "all" ||
    selectedFilter === "business" && a.type === "business" ||
    selectedFilter === "personal" && a.type === "personal" ||
    a.status === selectedFilter);
  list.replaceChildren();
  if (!visible.length) {
    list.append(cell("p", "No applications match this filter.", "muted"));
    return;
  }
  for (const a of visible) {
    const article = document.createElement("article");
    article.className = "application-card";
    article.append(cell("h3", a.fullName || "Unnamed applicant"));
    article.append(cell("p", [a.type === "business" ? "Business sponsor" : "Personal supporter",
      a.businessName, a.location].filter(Boolean).join(" • ")));
    article.append(cell("p", "Status: " + (a.status || "new").replaceAll("_", " ")));
    article.append(cell("p", "Received: " + dateLabel(a.createdAt)));
    article.append(cell("p", "Package: " + (a.packageId || "—")));
    article.append(cell("p", "Proposed annual amount: " +
      (Number.isSafeInteger(a.proposedAmountPence) ?
        new Intl.NumberFormat("en-GB", {style:"currency",currency:"GBP"}).format(a.proposedAmountPence / 100) : "—")));
    article.append(cell("p", "Email: " + (a.email || "—")));
    article.append(cell("p", "Website: " + (a.website || "—")));
    article.append(cell("p", "About: " + (a.bio || "—")));
    article.append(cell("p", "Message: " + (a.message || "—")));
    list.append(article);
  }
}
filters.addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button || button.disabled) return;
  selectedFilter = button.dataset.filter;
  for (const item of filters.querySelectorAll("button")) {
    item.setAttribute("aria-pressed", String(item === button));
  }
  render();
});

if (!ENABLE_SPONSORSHIP_ADMIN_READS) {
  showStatus("🔒 PREVIEW MODE — ADMIN DATA ACCESS DISABLED");
} else {
  // Firebase is imported only after the explicit security review flag is enabled.
  Promise.all([
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js")
  ]).then(([firebase, authSdk, dbSdk]) => {
    const app = firebase.getApps().length ? firebase.getApp() : firebase.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    let stopListening = null;
    authSdk.onAuthStateChanged(auth, user => {
      if (stopListening) { stopListening(); stopListening = null; }
      applications = [];
      stats.forEach(el => el.textContent = "—");
      list.replaceChildren();
      filters.querySelectorAll("button").forEach(button => button.disabled = true);
      if (!user || !ADMIN_UIDS.has(user.uid)) {
        showStatus("🔒 ADMIN ACCESS REQUIRED — SIGN IN WITH AN AUTHORISED ACCOUNT");
        return;
      }
      showStatus("🔐 ADMIN ACCOUNT VERIFIED — LOADING ENQUIRIES");
      const db = dbSdk.getDatabase(app);
      stopListening = dbSdk.onValue(dbSdk.ref(db, "sponsorshipApplications"), snapshot => {
        const value = snapshot.val() || {};
        applications = Object.entries(value).filter(([, a]) => a && typeof a === "object")
          .map(([id, a]) => ({...a, id}))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        filters.querySelectorAll("button").forEach(button => button.disabled = false);
        showStatus("🔒 AUTHORISED ADMIN VIEW — READ ONLY");
        render();
      }, error => {
        showStatus("🔒 DATABASE ACCESS DENIED OR UNAVAILABLE");
        console.error("Sponsorship admin read failed", error.code || error.message);
      });
    });
  }).catch(error => {
    showStatus("ADMIN CONNECTION UNAVAILABLE");
    console.error("Sponsorship admin initialisation failed", error);
  });
}
