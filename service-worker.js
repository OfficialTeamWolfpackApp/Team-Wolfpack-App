/* =========================================================
   TEAM WOLFPACK APP
   SERVICE WORKER
   PWA CACHE + FIREBASE CLOUD MESSAGING
========================================================= */


/* =========================================================
   FIREBASE CLOUD MESSAGING
========================================================= */

importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js"
);


firebase.initializeApp({
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
});


const messaging =
  firebase.messaging();


/* =========================================================
   FIREBASE BACKGROUND MESSAGES
========================================================= */

messaging.onBackgroundMessage(
  (payload) => {

    console.log(
      "[Team Wolfpack] Background notification received:",
      payload
    );

    const data =
      payload.data || {};

    const notification =
      payload.notification || {};

    const title =
      notification.title ||
      data.title ||
      "TEAM WOLFPACK";

    const body =
      notification.body ||
      data.body ||
      "A new Team Wolfpack update is available.";

    const targetURL =
      data.url ||
      "./updates.html";


    /*
      If Firebase supplied a notification payload,
      the browser may already display it.

      For data-only messages, display the
      notification ourselves.
    */

    if (!payload.notification) {

      return self.registration.showNotification(
        title,
        {
          body: body,

          icon:
            "./icon-192.png",

          badge:
            "./icon-192.png",

          tag:
            data.tag ||
            "team-wolfpack-update",

          renotify:
            true,

          data: {
            url:
              targetURL
          }
        }
      );

    }

  }
);


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

/* =========================================================
   NOTIFICATION CLICK
========================================================= */

self.addEventListener(
  "notificationclick",
  (event) => {

    event.notification.close();

    const notificationData =
      event.notification.data || {};

    const targetURL =
      notificationData.url ||
      "./index.html";

    const absoluteURL =
      new URL(
        targetURL,
        self.registration.scope
      ).href;

    event.waitUntil(
      (async () => {

        const clientList =
          await clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });

        /*
          If the app is already open, navigate that
          window to the notification destination.
        */

        for (const client of clientList) {

          if ("navigate" in client) {

            try {

              await client.navigate(
                absoluteURL
              );

              if ("focus" in client) {

                await client.focus();

              }

              return;

            } catch (error) {

              console.warn(
                "[Team Wolfpack] Could not navigate existing window:",
                error
              );

            }

          }

        }

        /*
          If no Team Wolfpack window is open,
          open the notification destination.
        */

        if (clients.openWindow) {

          await clients.openWindow(
            absoluteURL
          );

        }

      })()
    );

  }
);


/* =========================================================
   CACHE VERSION
========================================================= */

const CACHE_NAME =
  "team-wolfpack-v20";


/* =========================================================
   CORE APP FILES
========================================================= */

const APP_FILES = [
  "./",
  "./index.html",
  "./chat.html",
  "./fighters.html",
  "./mrs-wolfie.html",
  "./mr-wolfie.html",
  "./greig-sloan.html",
  "./fights.html",
  "./pack.html",
  "./sponsors.html",
  "./gallery.html",
  "./merch.html",
  "./contact.html",
  "./socials.html",
  "./about.html",
  "./updates.html",
  "./chat-rules.html",
  "./admin-dashboard.html",
  "./admin-fights.html",
  "./admin-updates.html",
  "./admin-reports.html",
  "./admin-members.html",
  "./admin-history.html",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.json"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          async (cache) => {

            for (const file of APP_FILES) {

              try {

                const response =
                  await fetch(
                    file,
                    {
                      cache: "reload"
                    }
                  );

                if (response.ok) {

                  await cache.put(
                    file,
                    response
                  );

                }

              } catch (error) {

                console.warn(
                  "Could not cache:",
                  file,
                  error
                );

              }

            }

          }
        )

    );

    self.skipWaiting();

  }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      (async () => {

        const cacheNames =
          await caches.keys();

        await Promise.all(

          cacheNames.map(
            (cacheName) => {

              if (
                cacheName.startsWith(
                  "team-wolfpack-"
                ) &&
                cacheName !== CACHE_NAME
              ) {

                return caches.delete(
                  cacheName
                );

              }

              return Promise.resolve();

            }
          )

        );

        await self.clients.claim();

      })()

    );

  }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  "fetch",
  (event) => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }

    const requestURL =
      new URL(
        event.request.url
      );


    /*
      Only handle files from
      Team Wolfpack itself.
    */

    if (
      requestURL.origin !==
      self.location.origin
    ) {

      return;

    }


    /* =====================================================
       PACK CHAT
       Always load latest version.
    ===================================================== */

    if (
      requestURL.pathname.endsWith(
        "/chat.html"
      )
    ) {

      event.respondWith(

        (async () => {

          try {

            const response =
              await fetch(
                event.request,
                {
                  cache: "no-store"
                }
              );

            if (
              response &&
              response.ok
            ) {

              const cache =
                await caches.open(
                  CACHE_NAME
                );

              await cache.put(
                event.request,
                response.clone()
              );

            }

            return response;

          } catch (error) {

            const cached =
              await caches.match(
                event.request
              );

            if (cached) {

              return cached;

            }

            return new Response(
              "Pack Chat is currently unavailable while offline.",
              {
                status: 503,

                headers: {
                  "Content-Type":
                    "text/plain"
                }
              }
            );

          }

        })()

      );

      return;

    }


    /* =====================================================
       SERVICE WORKER
       Never serve cached worker.
    ===================================================== */

    if (
      requestURL.pathname.endsWith(
        "/service-worker.js"
      )
    ) {

      event.respondWith(

        fetch(
          event.request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /* =====================================================
       MANIFEST
    ===================================================== */

    if (
      requestURL.pathname.endsWith(
        "/manifest.json"
      )
    ) {

      event.respondWith(

        fetch(
          event.request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /* =====================================================
       HTML PAGES
       Network first.
    ===================================================== */

    if (
      event.request.mode ===
        "navigate" ||
      requestURL.pathname.endsWith(
        ".html"
      )
    ) {

      event.respondWith(

        (async () => {

          try {

            const response =
              await fetch(
                event.request,
                {
                  cache: "no-store"
                }
              );

            if (
              response &&
              response.ok
            ) {

              const cache =
                await caches.open(
                  CACHE_NAME
                );

              await cache.put(
                event.request,
                response.clone()
              );

            }

            return response;

          } catch (error) {

            const cached =
              await caches.match(
                event.request
              );

            if (cached) {

              return cached;

            }

            const home =
              await caches.match(
                "./index.html"
              );

            if (home) {

              return home;

            }

            return new Response(
              "Team Wolfpack is currently offline.",
              {
                status: 503,

                headers: {
                  "Content-Type":
                    "text/plain"
                }
              }
            );

          }

        })()

      );

      return;

    }


    /* =====================================================
       IMAGES / STATIC FILES
    ===================================================== */

    event.respondWith(

      (async () => {

        try {

          const response =
            await fetch(
              event.request,
              {
                cache: "no-cache"
              }
            );

          if (
            response &&
            response.ok
          ) {

            const cache =
              await caches.open(
                CACHE_NAME
              );

            await cache.put(
              event.request,
              response.clone()
            );

          }

          return response;

        } catch (error) {

          const cached =
            await caches.match(
              event.request
            );

          if (cached) {

            return cached;

          }

          throw error;

        }

      })()

    );

  }
);
