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

  projectId:
    "team-wolfpack-app",

  storageBucket:
    "team-wolfpack-app.firebasestorage.app",

  messagingSenderId:
    "1070414578856",

  appId:
    "1:1070414578856:web:df14e7d387e658eeae2e9d"

});


const messaging =
  firebase.messaging();


messaging.onBackgroundMessage(function(payload){

  const notification =
    payload.notification || {};

  const title =
    notification.title ||
    "TEAM WOLFPACK";

  const options = {

    body:
      notification.body ||
      "New Team Wolfpack update.",

    icon:
      "/icon-192.png",

    badge:
      "/icon-192.png",

    data:
      payload.data || {}

  };


  self.registration.showNotification(
    title,
    options
  );

});


self.addEventListener(
  "notificationclick",
  function(event){

    event.notification.close();

    const target =
      event.notification.data?.url ||
      "/";

    event.waitUntil(
      clients.openWindow(target)
    );

  }
);
