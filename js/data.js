let addDoc;
let collection;
let doc;
let onSnapshot;
let serverTimestamp;
let updateDoc;
let setDoc;

let db = null;
let rtdb = null;
let ref = null;
let onValue = null;

const FIRESTORE_VERSION =
  "12.16.0";

const firebaseModulesReady =
  Promise.all([
    import(
      "https://www.gstatic.com/firebasejs/" +
        FIRESTORE_VERSION +
        "/firebase-firestore.js"
    ),

    import(
      "./firebase.js"
    )
  ])
    .then(
      ([
        firestoreModule,
        firebaseModule
      ]) => {

        addDoc =
          firestoreModule.addDoc;

        collection =
          firestoreModule.collection;

        doc =
          firestoreModule.doc;

        onSnapshot =
          firestoreModule.onSnapshot;

        serverTimestamp =
          firestoreModule.serverTimestamp;

        updateDoc =
          firestoreModule.updateDoc;

        setDoc =
          firestoreModule.setDoc;

        db =
          firebaseModule.db;

        rtdb =
          firebaseModule.rtdb;

        ref =
          firebaseModule.ref;

        onValue =
          firebaseModule.onValue;

        return true;
      }
    )
    .catch(
      error => {

        console.error(
          "RESCUE-IOT: Firebase modules failed to load:",
          error
        );

        throw error;
      }
    );


(function () {

  "use strict";


  /* =====================================================
     HELPERS
  ===================================================== */

  const now = () =>
    new Date();

  const localTime = () =>
    now().toLocaleString("en-PH");

  const clone = list =>
    Array.isArray(list)
      ? list.slice()
      : [];


  /* =====================================================
     APPLICATION STATE

     Firebase is the source of truth.
     This state only mirrors Firebase data locally.
  ===================================================== */

  const state = {

    currentWaterLevel: null,

    rainfall: {
      condition: "Unknown",
      intensity: "0",
      probability: 0
    },

    thresholds: {
  danger: { max: 20 },
  warning: { max: 50 },
  safe: { max: 500 }
},

    system: {
      gsm: "Unknown",
      siren: "Unknown",
      lights: "Unknown",
      battery: "—"
    },

    study: {
      primaryBarangay: "Marauoy"
    },


    /* Firestore collections */

    sensors: [],
    alerts: [],
    announcements: [],
    fieldUpdates: [],
    evacuationCenters: [],
    routes: [],
    roads: [],
    requestLocations: [],
    hotlines: [],
    rescueRequests: [],
    responders: [],
    floodZones: [],
    readings: [],


    /* ESP32 / Realtime Database */

    esp32: {

      /*
       * null means no live ESP32 reading
       * has been received yet.
       */

      distance: null,

      status: "Unknown",

      updatedAt: null

    },


    firebaseReady: false,

    initialized: false,


    /* Firestore listeners */

    unsubscribers: [],


    /* Realtime Database listeners */

    rtdbUnsubscribers: []

  };


  /* =====================================================
     DATE FUNCTIONS
  ===================================================== */

  function asDate(value) {

    if (
      value &&
      typeof value.toDate ===
        "function"
    ) {

      return value.toDate();

    }

    if (!value) {

      return new Date(0);

    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? new Date(0)
      : date;

  }


  function displayTime(value) {

    const date =
      asDate(value);

    return date.getTime() === 0
      ? localTime()
      : date.toLocaleString(
          "en-PH"
        );

  }


  /* =====================================================
     FIRESTORE DOCUMENT LIST
  ===================================================== */

  function documentList(snapshot) {

    return snapshot.docs.map(
      item => {

        const data =
          item.data() || {};

        return {

          ...data,

          id:
            data.id ||
            item.id,

          _firestoreId:
            item.id

        };

      }
    );

  }


  /* =====================================================
     DISPATCH UPDATE EVENT
  ===================================================== */

  function dispatchUpdate(
    collectionName
  ) {

    window.dispatchEvent(

      new CustomEvent(
        "RescueDataUpdated",
        {

          detail: {

            collection:
              collectionName

          }

        }
      )

    );

  }


  /* =====================================================
     WATER STATUS
  ===================================================== */

 function statusFor(level) {
  const value = Number(level);

  const dangerMax = Number(state.thresholds?.danger?.max) || 20;
  const warningMax = Number(state.thresholds?.warning?.max) || 50;

  if (!Number.isFinite(value)) {
    return {
      key: "info",
      label: "No live data",
      color: "#64748b",
      action: "Waiting for a live Firebase sensor reading."
    };
  }

  // ESP32 alignment:
  // ≤20 cm = Danger
  // 21–50 cm = Caution
  // >50 cm = Safe
  if (value <= dangerMax) {
    return {
      key: "danger",
      label: "Danger",
      color: "#dc2626",
      action: "Evacuate immediately and avoid flood-prone areas."
    };
  }

  if (value <= warningMax) {
    return {
      key: "warning",
      label: "Caution",
      color: "#d97706",
      action: "Prepare for evacuation and monitor official updates."
    };
  }

  return {
    key: "safe",
    label: "Normal",
    color: "#059669",
    action: "Conditions are stable. Stay informed and prepared."
  };
}


  /* =====================================================
     REFRESH WATER LEVEL

     Priority:
     1. Actual ESP32 reading from RTDB
     2. Firestore sensor reading
  ===================================================== */

  function refreshWaterLevel() {

    const esp32Distance =
      Number(
        state.esp32.distance
      );


    /*
     * Only use ESP32 if an actual
     * reading has been received.
     */

    if (
      state.esp32.updatedAt &&
      Number.isFinite(
        esp32Distance
      )
    ) {

      state.currentWaterLevel =
        esp32Distance;

      return;

    }


    /*
     * Fallback to Firestore sensors.
     */

    const source =
      state.sensors.find(
        sensor =>
          sensor.lastReading !==
            undefined ||
          sensor.waterLevel !==
            undefined ||
          sensor.level !==
            undefined
      );


    const level =
      Number(

        source?.lastReading ??
        source?.waterLevel ??
        source?.level

      );


    if (
      Number.isFinite(level)
    ) {

      state.currentWaterLevel =
        level;

    } else {

      state.currentWaterLevel =
        null;

    }

  }


  /* =====================================================
     REFRESH LOCATIONS
  ===================================================== */

  function refreshLocations() {

    state.requestLocations =
      state.evacuationCenters.map(
        center => ({

          name:
            center.name ||
            center.location ||
            "Unnamed location"

        })
      );

  }


  /* =====================================================
     COMMUNITY UPDATES

     Announcements and field updates remain
     separate internally and are combined only
     when requested.
  ===================================================== */

  function getCommunityUpdates() {

    return [

      ...clone(
        state.announcements
      ),

      ...clone(
        state.fieldUpdates
      )

    ]

      .sort(

        (a, b) =>

          asDate(

            b.createdAt ||
            b.firebaseCreatedAt ||
            b.time

          )

          -

          asDate(

            a.createdAt ||
            a.firebaseCreatedAt ||
            a.time

          )

      );

  }


  /* =====================================================
     FIRESTORE SUBSCRIPTION
  ===================================================== */

  function subscribe(
    collectionName,
    apply
  ) {

    const unsubscribe =
      onSnapshot(

        collection(
          db,
          collectionName
        ),

        snapshot => {

          apply(
            documentList(
              snapshot
            )
          );

          state.firebaseReady =
            true;

          dispatchUpdate(
            collectionName
          );

        },

        error => {

          console.error(

            `RESCUE-IOT: Unable to load Firestore collection "${collectionName}".`,

            error

          );

        }

      );


    state.unsubscribers.push(
      unsubscribe
    );

  }


  /* =====================================================
     REALTIME DATABASE SUBSCRIPTION
  ===================================================== */

  function subscribeRTDB(
    path,
    apply
  ) {

    if (!rtdb) {

      console.error(
        "RESCUE-IOT: Realtime Database is unavailable."
      );

      return;

    }


    const databaseRef =
      ref(
        rtdb,
        path
      );


    const unsubscribe =
      onValue(

        databaseRef,

        snapshot => {

          const data =
            snapshot.val() || {};

          apply(data);

          state.firebaseReady =
            true;

          dispatchUpdate(
            path
          );

        },

        error => {

          console.error(

            `RESCUE-IOT: Unable to load RTDB path "${path}".`,

            error

          );

        }

      );


    state.rtdbUnsubscribers.push(
      unsubscribe
    );

  }


  /* =====================================================
     RESCUE DATA API
  ===================================================== */

  const RescueData = {

    formatTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit"
  });
},


    /* ===================================================
       LIVE WATER LEVEL
    =================================================== */

    get currentWaterLevel() {

      return Number(
        state.currentWaterLevel
      );

    },


    /* ===================================================
       ESP32 DATA
    =================================================== */

    get esp32() {

      return {

        ...state.esp32

      };

    },


    get esp32Distance() {

      return state.esp32.distance === null
        ? null
        : Number(
            state.esp32.distance
          );

    },


    get esp32Status() {

      return state.esp32.status;

    },


    /* ===================================================
       COLLECTION GETTERS
    =================================================== */

    get sensors() {

      return state.sensors;

    },


    get alerts() {

      return state.alerts;

    },


    get evacuationCenters() {

      return state.evacuationCenters;

    },


    get routes() {

      return state.routes;

    },


    get roads() {

      return state.roads;

    },


    get rainfall() {

      return state.rainfall;

    },


    get thresholds() {

      return state.thresholds;

    },


    set thresholds(value) {

      if (value && typeof value === "object") {
        state.thresholds = {
          ...state.thresholds,
          ...value,
          safe: { ...state.thresholds.safe, ...(value.safe || {}) },
          warning: { ...state.thresholds.warning, ...(value.warning || {}) },
          danger: { ...state.thresholds.danger, ...(value.danger || {}) }
        };
      }

    },


    get system() {

      return state.system;

    },


    get study() {

      return state.study;

    },


    get requestLocations() {

      return state.requestLocations;

    },


    get responderLocations() {

      return state.responders;

    },

    get floodZones() {

      return state.floodZones;

    },


    get hotlines() {

      return state.hotlines;

    },


    get communityUpdates() {

      return getCommunityUpdates();

    },


    /* ===================================================
       STATUS
    =================================================== */

    status(
      level =
        state.currentWaterLevel
    ) {

      return statusFor(
        level
      );

    },


    /* ===================================================
       ALERTS
    =================================================== */

    getAlerts() {

      return clone(
        state.alerts
      )

        .sort(

          (a, b) =>

            asDate(

              b.createdAt ||
              b.firebaseCreatedAt ||
              b.time

            )

            -

            asDate(

              a.createdAt ||
              a.firebaseCreatedAt ||
              a.time

            )

        );

    },


    async addAlert(
      alert = {}
    ) {

      const payload = {

        type:
          alert.type ||
          "warning",

        level:
          alert.level ||
          "Warning",

        message:
          alert.message ||
          "",
        sensor:
          alert.sensor ||
          "System",
        channels:
          Array.isArray(
            alert.channels
          )
            ? alert.channels
            : [],

        createdAt:
          now().toISOString(),

        firebaseCreatedAt:
          serverTimestamp()

      };


      const reference =
        await addDoc(

          collection(
            db,
            "alerts"
          ),

          payload

        );


      return {

        ...payload,

        id:
          reference.id,

        _firestoreId:
          reference.id,

        time:
          localTime()

      };

    },


    /* ===================================================
       ANNOUNCEMENTS
    =================================================== */

    async addAnnouncement(
      announcement = {}
    ) {

      const payload = {

        title:
          announcement.title ||
          "Community Announcement",

        message:
          announcement.message ||
          "",

        author:
          announcement.author ||
          "Administrator",

        email:
          announcement.email ||
          "",

        createdAt:
          now().toISOString(),

        firebaseCreatedAt:
          serverTimestamp()

      };


      const reference =
        await addDoc(

          collection(
            db,
            "announcements"
          ),

          payload

        );


      return {

        ...payload,

        id:
          reference.id,

        _firestoreId:
          reference.id,

        time:
          localTime()

      };

    },


    /* ===================================================
       FIELD UPDATES
    =================================================== */

    async addFieldUpdate(
      update = {}
    ) {

      const payload = {

        title:
          update.title ||
          "Field Update",

        message:
          update.message ||
          "",

        author:
          update.author ||
          "Field Team",

        email:
          update.email ||
          "",

        createdAt:
          now().toISOString(),

        firebaseCreatedAt:
          serverTimestamp()

      };


      const reference =
        await addDoc(

          collection(
            db,
            "fieldUpdates"
          ),

          payload

        );


      return {

        ...payload,

        id:
          reference.id,

        _firestoreId:
          reference.id,

        time:
          localTime()

      };

    },


    /* ===================================================
       EVACUATION CENTERS
    =================================================== */

    getEvacuationCenters() {

      return clone(
        state.evacuationCenters
      );

    },


    /* ===================================================
       ROUTES
    =================================================== */

    getRoutes() {

      return clone(
        state.routes
      );

    },


    /* ===================================================
       ROADS
    =================================================== */

    async updateRoadStatus(
      idOrName,
      status
    ) {

      const road =
        state.roads.find(

          item =>

            item.id ===
              idOrName ||

            item._firestoreId ===
              idOrName ||

            item.name ===
              idOrName

        );


      if (!road) {

        return false;

      }


      await updateDoc(

        doc(

          db,

          "roads",

          road._firestoreId ||
          road.id

        ),

        {

          status,
          ...updates,
          updatedAt:
            now().toISOString(),

          firebaseUpdatedAt:
            serverTimestamp()

        }

      );


      return true;

    },


    /* ===================================================
       HISTORY
    =================================================== */

    history(hours = 6) {
  const requestedHours = Number(hours);

  const rangeHours =
    Number.isFinite(requestedHours) && requestedHours > 0
      ? requestedHours
      : 6;

  const cutoff =
    Date.now() -
    rangeHours * 60 * 60 * 1000;

  return clone(state.readings)
    .filter(item => {
      const time = asDate(item.time);

      return (
        time.getTime() > 0 &&
        time.getTime() >= cutoff
      );
    })
    .sort(
      (a, b) =>
        asDate(a.time).getTime() -
        asDate(b.time).getTime()
    );
},


    /* ===================================================
       ONLINE SENSORS
    =================================================== */

    onlineSensors() {

      return state.sensors.filter(

        sensor =>

          String(
            sensor.status
          )
            .toLowerCase() ===
              "online"

      ).length;

    },


    /* ===================================================
       RESCUE REQUESTS
    =================================================== */

    openRescueRequests() {

      return state.rescueRequests.filter(

        request =>
          request.status !==
            "Resolved"

      );

    },


    requestsByEmail(
      email
    ) {

      const target =
        String(
          email || ""
        )
          .trim()
          .toLowerCase();


      return state.rescueRequests.filter(

        request =>

          String(
            request.email || ""
          )
            .trim()
            .toLowerCase() ===
              target

      );

    },


    /* ===================================================
       ADD RESCUE REQUEST
    =================================================== */

    async addRescueRequest(
      request = {}
    ) {

      const payload = {

        reporter:
          request.reporter ||
          "Resident",

        email:
          request.email ||
          "",

        type:
          request.type ||
          "Assistance Request",

        location:
          request.location ||
          "Unknown location",

        latitude:
          Number.isFinite(
            Number(request.latitude)
          )
            ? Number(request.latitude)
            : null,

        longitude:
          Number.isFinite(
            Number(request.longitude)
          )
            ? Number(request.longitude)
            : null,

        locationAccuracy:
          Number.isFinite(
            Number(request.locationAccuracy)
          )
            ? Number(request.locationAccuracy)
            : null,

        locationSource:
          request.locationSource ||
          "manual",

        people:
          Number.isFinite(
            Number(request.people)
          )
            ? Math.max(
                1,
                Math.min(
                  50,
                  Math.round(
                    Number(request.people)
                  )
                )
              )
            : 1,

        note:
          request.note ||
          "",

        priority:
          request.priority ||
          "Medium",

        status:
          "Pending",

        createdAt:
          now().toISOString(),

        firebaseCreatedAt:
          serverTimestamp()

      };


      const reference =
        await addDoc(

          collection(
            db,
            "rescueRequests"
          ),

          payload

        );


      return {

        ...payload,

        id:
          reference.id,

        _firestoreId:
          reference.id,

        time:
          localTime()

      };

    },


    /* ===================================================
       FIREBASE SETTINGS
    =================================================== */

    async saveSettings(
      settings = {}
    ) {
      if (
        !db ||
        typeof setDoc !== "function" ||
        typeof doc !== "function"
      ) {
        throw new Error(
          "Firestore settings service is unavailable."
        );
      }

      const clean = settings &&
        typeof settings === "object"
        ? settings
        : {};

      await setDoc(
        doc(db, "settings", "app"),
        clean,
        { merge: true }
      );

      return clean;
    },

    /* ===================================================
       UPDATE RESPONDER LOCATION
    =================================================== */

    async updateResponderLocation(
      responderId,
      data = {}
    ) {

      if (
        !db ||
        typeof setDoc !== "function"
      ) {
        throw new Error(
          "Firestore responder location service is unavailable."
        );
      }

      const id =
        String(
          responderId ||
          ""
        )
          .trim();

      if (!id) {
        throw new Error(
          "Responder ID is required."
        );
      }

      const payload = {
        responderId: id,
        name:
          data.name ||
          "Responder",
        email:
          data.email ||
          "",
        status:
          data.status ||
          "offline",
        location:
          data.location || {
            latitude:
              Number(data.latitude),
            longitude:
              Number(data.longitude),
            accuracy:
              Number(data.accuracy) || null
          },
        latitude:
          Number.isFinite(
            Number(data.latitude)
          )
            ? Number(data.latitude)
            : null,
        longitude:
          Number.isFinite(
            Number(data.longitude)
          )
            ? Number(data.longitude)
            : null,
        accuracy:
          Number.isFinite(
            Number(data.accuracy)
          )
            ? Number(data.accuracy)
            : null,
        updatedAt:
          serverTimestamp()
      };

      await setDoc(
        doc(
          db,
          "responders",
          id
        ),
        payload,
        { merge: true }
      );

      return {
        ...payload,
        id
      };

    },


    /* ===================================================
       UPDATE RESCUE REQUEST
    =================================================== */

    async updateRescueRequest(
      id,
      status,
      updates = {}
    ) {

      const request =
        state.rescueRequests.find(

          item =>

            item.id === id ||

            item._firestoreId === id

        );


      if (!request) {

        return false;

      }


      await updateDoc(

        doc(

          db,

          "rescueRequests",

          request._firestoreId ||
          request.id

        ),

        {

          status,

          updatedAt:
            now().toISOString(),

          firebaseUpdatedAt:
            serverTimestamp()

        }

      );


      return true;

    },


    /* ===================================================
       UPDATE WATER LEVEL
    =================================================== */

    updateWaterLevel() {

      refreshWaterLevel();

      return state.currentWaterLevel;

    },


    /* ===================================================
       INITIALIZE FIREBASE
    =================================================== */

    async initialize() {
  if (state.initialized) {
    return RescueData;
  }

  await firebaseModulesReady;

  if (!db) {
    state.initialized = false;
    throw new Error(
      "RESCUE-IOT: Firestore database is unavailable."
    );
  }

  state.initialized = true;

      /* ===============================================
         ESP32 REALTIME DATABASE
      =============================================== */

      subscribeRTDB(

        "sensor",

        sensorData => {

          const distance =
            Number(
              sensorData.distance
            );


          const status =
            sensorData.status ||
            "Unknown";


          /*
           * Only accept a valid reading.
           */

          const validDistance =
            Number.isFinite(
              distance
            );


          const readingTime =
            new Date();

          state.esp32 = {

            distance:
              validDistance
                ? distance
                : null,

            status,

            updatedAt:
              validDistance
                ? readingTime
                : null

          };

          /*
           * Add the actual RTDB ESP32 reading to the
           * in-memory monitoring history so the live
           * chart plots real Firebase data instead of
           * simulated values.
           */
          if (validDistance) {
            state.readings.push({
              time: readingTime,
              level: distance,
              value: distance,
              source: "Realtime Database"
            });

            if (state.readings.length > 5000) {
              state.readings.splice(0, state.readings.length - 5000);
            }
          }

          /* Accept rainfall when the ESP32 publishes it. */
          const rainfall =
            sensorData.rainfall;

          if (rainfall && typeof rainfall === "object") {
            state.rainfall = {
              ...state.rainfall,
              condition: rainfall.condition || state.rainfall.condition,
              intensity: rainfall.intensity ?? state.rainfall.intensity,
              probability: rainfall.probability ?? state.rainfall.probability
            };
          } else if (sensorData.rainfallIntensity !== undefined) {
            state.rainfall = {
              ...state.rainfall,
              intensity: sensorData.rainfallIntensity,
              condition: sensorData.rainfallCondition || state.rainfall.condition
            };
          }


          /*
           * Create virtual ESP32 sensor.
           */

          const esp32Sensor = {

            id:
              "esp32-water-sensor",

            name:
              "ESP32 Water Sensor",

            distance:
              validDistance
                ? distance
                : null,

            lastReading:
              validDistance
                ? distance
                : null,

            status:
              validDistance
                ? "online"
                : "offline",

            sensorStatus:
              status,

            updatedAt:
              new Date(),

            source:
              "Realtime Database"

          };


          /*
           * Remove old ESP32 copy.
           */

          state.sensors =
            state.sensors.filter(

              sensor =>

                sensor.id !==
                  "esp32-water-sensor"

            );


          /*
           * Add current ESP32 sensor.
           */

          state.sensors.push(
            esp32Sensor
          );


          refreshWaterLevel();


          /*
           * ESP32-specific update event.
           */

          window.dispatchEvent(

            new CustomEvent(

              "ESP32DataUpdated",

              {

                detail: {

                  distance:
                    validDistance
                      ? distance
                      : null,

                  status,

                  sensor:
                    esp32Sensor

                }

              }

            )

          );

        }

      );


      /* ===============================================
         FIRESTORE SENSORS
      =============================================== */

      subscribe(

        "sensors",

        items => {

          const esp32Sensor =
            state.sensors.find(

              sensor =>

                sensor.id ===
                  "esp32-water-sensor"

            );


          state.sensors =
            items;


          if (
            esp32Sensor
          ) {

            state.sensors.push(
              esp32Sensor
            );

          }


          refreshWaterLevel();

        }

      );


      /* ===============================================
         ALERTS
      =============================================== */

      subscribe(

        "alerts",

        items => {

          state.alerts =
            items;

        }

      );


      /* ===============================================
         ANNOUNCEMENTS
      =============================================== */

      subscribe(

        "announcements",

        items => {

          state.announcements =
            items.map(

              item => ({

                ...item,

                author:
                  item.author ||
                  item.createdBy ||
                  "Administrator",

                title:
                  item.title ||
                  "Community Announcement",

                time:
                  item.time ||
                  displayTime(

                    item.createdAt ||
                    item.firebaseCreatedAt

                  )

              })

            );

        }

      );


      /* ===============================================
         FIELD UPDATES
      =============================================== */

      subscribe(

        "fieldUpdates",

        items => {

          state.fieldUpdates =
            items.map(

              item => ({

                ...item,

                author:
                  item.author ||
                  item.responder ||
                  "Field Team",

                title:
                  item.title ||
                  "Field Update",

                time:
                  item.time ||
                  displayTime(

                    item.createdAt ||
                    item.firebaseCreatedAt

                  )

              })

            );

        }

      );


      /* ===============================================
         EVACUATION CENTERS
      =============================================== */

      subscribe(

        "evacuationCenters",

        items => {

          state.evacuationCenters =
            items;

          refreshLocations();

        }

      );


      /* ===============================================
         ROUTES
      =============================================== */

      subscribe(

        "routes",

        items => {

          state.routes =
            items;

        }

      );


      /* ===============================================
         ROADS
      =============================================== */

      subscribe(

        "roads",

        items => {

          state.roads =
            items;

        }

      );


      /* ===============================================
         HOTLINES
      =============================================== */

      subscribe(

        "hotlines",

        items => {

          state.hotlines =
            items;

        }

      );


      /* ===============================================
         RESCUE REQUESTS
      =============================================== */

      subscribe(

        "rescueRequests",

        items => {

          state.rescueRequests =
            items;

        }

      );


      /* ===============================================
         RESPONDER LOCATIONS
      =============================================== */

      subscribe(

        "responders",

        items => {

          state.responders =
            items;

        }

      );


      /* ===============================================
         FLOOD ZONES
      =============================================== */

      subscribe(
        "floodZones",
        items => {
          state.floodZones = items;
        }
      );


      /* ===============================================
         HISTORY
      =============================================== */

      subscribe(

        "history",

        items => {

          const firestoreReadings =
            items.map(

              item => ({

                time:

                  item.time ||

                  displayTime(

                    item.createdAt ||
                    item.firebaseCreatedAt

                  ),

                value:

                  Number(

                    item.value ??
                    item.level ??
                    item.waterLevel ??
                    item.reading ??
                    0

                  ),

                level:

                  Number(

                    item.value ??
                    item.level ??
                    item.waterLevel ??
                    item.reading ??
                    0

                  )

              })

            );

          const liveReadings =
            state.readings.filter(
              item =>
                item.source ===
                "Realtime Database"
            );

          state.readings =
            firestoreReadings
              .concat(liveReadings);

        }

      );


      /* ===============================================
         SETTINGS
      =============================================== */

      subscribe(

        "settings",

        items => {

          const settings =
            Object.assign(
              {},
              ...items
            );


          if (
            settings.system
          ) {
            state.system = {
              ...state.system,
              ...settings.system
            };
          }
          if (
            settings.rainfall
          ) {
            state.rainfall = {
              ...state.rainfall,
              ...settings.rainfall
            };
          }
          if (
            settings.study
          ) {
            state.study = {
              ...state.study,
              ...settings.study
            };
          }

          if (
            settings.thresholds
          ) {
            state.thresholds = {
              ...state.thresholds,
              ...settings.thresholds,
              safe: {
                ...state.thresholds.safe,
                ...(settings.thresholds.safe || {})
              },
              warning: {
                ...state.thresholds.warning,
                ...(settings.thresholds.warning || {})
              },
              danger: {
                ...state.thresholds.danger,
                ...(settings.thresholds.danger || {})
              }
            };
          }
        }
      );
      /* ===============================================
         DATA READY
      =============================================== */
      state.firebaseReady =
        true;
      window.dispatchEvent(
        new CustomEvent(
          "RescueDataReady",
          {
            detail: {
              source:
                "firestore + realtime-database"
            }
          }
        )
      );

      console.log(
        "RESCUE-IOT: Data system initialized."
      );
      return RescueData;
    },

    /* ===================================================
       DESTROY LISTENERS
    =================================================== */
    destroy() {
      /* Firestore */
      state.unsubscribers
        .splice(0)
        .forEach(
          unsubscribe => {
            if (
              typeof unsubscribe ===
              "function"
            ) {
              unsubscribe();
            }
          }
        );
      /* Realtime Database */
      state.rtdbUnsubscribers
        .splice(0)
        .forEach(
          unsubscribe => {
            if (
              typeof unsubscribe ===
              "function"
            ) {
              unsubscribe();
            }
          }
        );
      state.initialized =
        false;

      state.firebaseReady =
        false;

      console.log(
        "RESCUE-IOT: Data listeners destroyed."
      );
    }
  };
  /* =====================================================
     EXPOSE GLOBALLY
  ===================================================== */
  window.RescueData =
    RescueData;

})();