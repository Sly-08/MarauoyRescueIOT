import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAnalytics
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";


/* =====================================================
   FIREBASE CONFIGURATION
===================================================== */

const firebaseConfig = {

  apiKey: "AIzaSyAO5mp8Jyzju66CpkubSg_qPPQ_KE1EJOQ",

  authDomain:
    "rescueiot.firebaseapp.com",

  databaseURL:
    "https://rescueiot-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId:
    "rescueiot",

  storageBucket:
    "rescueiot.firebasestorage.app",

  messagingSenderId:
    "254469261868",

  appId:
    "1:254469261868:web:d58485f59d766975af5f89",

  measurementId:
    "G-9TBZ9Z8KR1"

};


/* =====================================================
   INITIALIZE FIREBASE
===================================================== */

const app =
  initializeApp(
    firebaseConfig
  );


/* =====================================================
   ANALYTICS
===================================================== */

let analytics = null;

try {

  analytics =
    getAnalytics(
      app
    );

} catch (error) {

  console.warn(
    "RESCUE-IOT: Firebase Analytics unavailable.",
    error
  );

}


/* =====================================================
   FIRESTORE
===================================================== */

const db =
  getFirestore(
    app
  );


/* =====================================================
   REALTIME DATABASE
===================================================== */

const rtdb =
  getDatabase(
    app
  );


/* =====================================================
   OPTIONAL GLOBAL REFERENCES
===================================================== */

window.firebaseApp =
  app;

window.firebaseAnalytics =
  analytics;


/* Firestore */

window.firebaseDB =
  db;

window.firebaseFirestore =
  db;

window.firestoreDB =
  db;


/* Realtime Database */

window.firebaseRTDB =
  rtdb;


/* =====================================================
   DEBUG LOGS
===================================================== */

console.log(
  "RESCUE-IOT: Firebase initialized."
);

console.log(
  "RESCUE-IOT: Firestore initialized."
);

console.log(
  "RESCUE-IOT: Realtime Database initialized."
);


/* =====================================================
   EXPORTS
===================================================== */

export {

  app,

  analytics,

  db,

  rtdb,

  ref,

  onValue

};