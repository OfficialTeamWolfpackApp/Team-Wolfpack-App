const CACHE_NAME = "team-wolfpack-v11";

const APP_FILES = [
  "./",
  "./index.html",
  "./fighters.html",
  "./mrs-wolfie.html",
  "./greig-sloan.html",
  "./fights.html",
  "./pack.html",
  "./sponsors.html",
  "./gallery.html",
  "./merch.html",
  "./contact.html",
  "./socials.html",
  "./about.html",
  "./chat-rules.html",
  "./admin-dashboard.html",
  "./admin-reports.html",
  "./admin-members.html",
  "./admin-history.html",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.json"
];


/* =========================================
   INSTALL
========================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME).then(async cache => {

      for (const file of APP_FILES) {

        try {

          const response = await fetch(
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

    })

  );

  self.skipWaiting();

});


/* =========================================
   ACTIVATE
========================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    (async () => {

      const cacheNames =
        await caches.keys();

      await Promise.all(

        cacheNames.map(
          cacheName => {

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

          }
        )

      );

      await self.clients.claim();

    })()

  );

});


/* =========================================
   FETCH
========================================= */

self.addEventListener("fetch", event => {

  if (
    event.request.method !== "GET"
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


  /* =======================================
     PACK CHAT
     Always load latest version.
  ======================================= */

  if (
    requestURL.pathname.endsWith(
      "/chat.html"
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


  /* =======================================
     SERVICE WORKER
     Never serve cached worker.
  ======================================= */

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


  /* =======================================
     MANIFEST
  ======================================= */

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


  /* =======================================
     HTML PAGES
     Network first.
  ======================================= */

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


  /* =======================================
     IMAGES / STATIC FILES
  ======================================= */

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

});
