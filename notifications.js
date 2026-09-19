/* =========================================================
   TEAM WOLFPACK APP
   PUSH NOTIFICATIONS

   Firebase Cloud Messaging
   Firebase App Check
========================================================= */

import {
  initializeApp
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken as getAppCheckToken
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyC06RDrqpXodbYBJqyeGvRkmtxQGapaaPY",

  authDomain:
    "team-wolfpack-app.firebaseapp.com",

  databaseURL:
    "https://team-wolfpack-app-default-rtdb.europe-west1.firebasedatabase.app",

  projectId:
    "team-wolfpack-app",

  storageBucket:
    "team-wolfpack-app.firebasestorage.app",

  messagingSenderId:
    "1070414578856",

  appId:
    "1:1070414578856:web:df14e7d387e658eeae2e9d",

  measurementId:
    "G-6JTCE2N9LZ"
};


/* =========================================================
   FIREBASE APP
========================================================= */

const app =
  initializeApp(firebaseConfig);


/* =========================================================
   APP CHECK
========================================================= */

const RECAPTCHA_ENTERPRISE_SITE_KEY =
  "6LfYlcItAAAAAGQtEJFKYH6fyERwXiAfVeBqJhOR";


const appCheck =
  initializeAppCheck(
    app,
    {
      provider:
        new ReCaptchaEnterpriseProvider(
          RECAPTCHA_ENTERPRISE_SITE_KEY
        ),

      isTokenAutoRefreshEnabled:
        true
    }
  );


/* =========================================================
   FIREBASE CLOUD MESSAGING VAPID KEY
========================================================= */

const VAPID_KEY =
  "BFiQ3IfeNlorv_csTQPN0qD7MKDu-98GjjPzxL7x5AK3sJmxlZyA6dGpDD9uEUpkxWlNZv4jQ37QdnvRTQckRrg";


/* =========================================================
   SECURE TEAM WOLFPACK DEVICE REGISTRATION ENDPOINT

   We will create this Cloud Function next.
========================================================= */

const REGISTRATION_URL =
  "https://europe-west1-team-wolfpack-app.cloudfunctions.net/" +
  "registerTeamWolfpackPushDevice";


/* =========================================================
   LOCAL STORAGE
========================================================= */

const LOCAL_TOKEN_KEY =
  "teamWolfpackPushToken";


/* =========================================================
   STATE
========================================================= */

let messaging = null;

let serviceWorkerRegistration = null;

let registrationInProgress = false;


/* =========================================================
   SERVICE WORKER
========================================================= */

async function getTeamWolfpackServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {

    throw new Error(
      "SERVICE_WORKER_NOT_SUPPORTED"
    );

  }


  serviceWorkerRegistration =
    await navigator.serviceWorker.register(
      "./service-worker.js"
    );


  await navigator.serviceWorker.ready;


  console.log(
    "Team Wolfpack unified PWA + Messaging worker registered."
  );


  return serviceWorkerRegistration;

}


/* =========================================================
   REGISTER DEVICE WITH SECURE BACKEND
========================================================= */

async function registerDeviceWithBackend(
  fcmToken
) {

  const appCheckResult =
    await getAppCheckToken(
      appCheck,
      false
    );


  if (
    !appCheckResult ||
    !appCheckResult.token
  ) {

    throw new Error(
      "APP_CHECK_TOKEN_UNAVAILABLE"
    );

  }


  const response =
    await fetch(
      REGISTRATION_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Firebase-AppCheck":
            appCheckResult.token
        },

        body:
          JSON.stringify({
            token:
              fcmToken
          })
      }
    );


  let result = {};


  try {

    result =
      await response.json();

  } catch (error) {

    result = {};

  }


  if (
    !response.ok ||
    result.success !== true
  ) {

    const backendError =
      result.error ||
      "TEAM_WOLFPACK_REGISTRATION_FAILED";


    throw new Error(
      backendError
    );

  }


  localStorage.setItem(
    LOCAL_TOKEN_KEY,
    fcmToken
  );


  console.log(
    "Team Wolfpack device securely registered with backend."
  );


  window.dispatchEvent(
    new CustomEvent(
      "teamWolfpackNotificationRegistered",
      {
        detail: {
          registered:
            true
        }
      }
    )
  );


  return true;

}


/* =========================================================
   ENABLE PUSH NOTIFICATIONS
========================================================= */

async function enableTeamWolfpackNotifications() {

  if (registrationInProgress) {

    return {
      success: false,
      reason: "REGISTRATION_IN_PROGRESS"
    };

  }


  registrationInProgress =
    true;


  try {

    const supported =
      await isSupported();


    if (!supported) {

      console.warn(
        "Firebase Messaging is not supported on this browser."
      );


      return {
        success: false,
        reason: "MESSAGING_NOT_SUPPORTED"
      };

    }


    if (
      !("Notification" in window)
    ) {

      return {
        success: false,
        reason: "NOTIFICATIONS_NOT_SUPPORTED"
      };

    }


    let permission =
      Notification.permission;


    if (
      permission === "default"
    ) {

      permission =
        await Notification.requestPermission();

    }


    console.log(
      "Team Wolfpack notification permission:",
      permission
    );


    if (
      permission !== "granted"
    ) {

      return {
        success: false,
        reason: "PERMISSION_NOT_GRANTED"
      };

    }


    const worker =
      await getTeamWolfpackServiceWorker();


    messaging =
      getMessaging(app);


    const fcmToken =
      await getToken(
        messaging,
        {
          vapidKey:
            VAPID_KEY,

          serviceWorkerRegistration:
            worker
        }
      );


    if (!fcmToken) {

      throw new Error(
        "FCM_TOKEN_UNAVAILABLE"
      );

    }


    await registerDeviceWithBackend(
      fcmToken
    );


    console.log(
      "Team Wolfpack push notifications enabled."
    );


    return {
      success: true,
      registered: true
    };

  } catch (error) {

    console.error(
      "Team Wolfpack notification setup failed:",
      error
    );


    return {
      success: false,
      reason:
        error &&
        error.message ?
          error.message :
          "NOTIFICATION_SETUP_FAILED"
    };

  } finally {

    registrationInProgress =
      false;

  }

}


/* =========================================================
   FOREGROUND MESSAGES
========================================================= */

async function initialiseForegroundMessages() {

  try {

    const supported =
      await isSupported();


    if (!supported) {

      return;

    }


    messaging =
      messaging ||
      getMessaging(app);


    onMessage(
      messaging,
      (payload) => {

        console.log(
          "[Team Wolfpack] Foreground notification received:",
          payload
        );


        window.dispatchEvent(
          new CustomEvent(
            "teamWolfpackForegroundNotification",
            {
              detail:
                payload
            }
          )
        );

      }
    );

  } catch (error) {

    console.warn(
      "Team Wolfpack foreground messaging could not start:",
      error
    );

  }

}


/* =========================================================
   CURRENT STATUS
========================================================= */

function getTeamWolfpackNotificationStatus() {

  const permission =
    "Notification" in window ?
      Notification.permission :
      "unsupported";


  const locallyRegistered =
    Boolean(
      localStorage.getItem(
        LOCAL_TOKEN_KEY
      )
    );


  return {
    permission:
      permission,

    registered:
      permission === "granted" &&
      locallyRegistered
  };

}


/* =========================================================
   PUBLIC API
========================================================= */

window.TeamWolfpackNotifications = {

  enable:
    enableTeamWolfpackNotifications,

  status:
    getTeamWolfpackNotificationStatus

};


/* =========================================================
   START FOREGROUND LISTENER
========================================================= */

initialiseForegroundMessages();
