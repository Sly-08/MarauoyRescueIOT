const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

// =====================================================
// ENVIRONMENT
// =====================================================

dotenv.config();

// =====================================================
// EXPRESS
// =====================================================

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// =====================================================
// FIREBASE ADMIN INITIALIZATION
// =====================================================

const serviceAccountPath = path.resolve(
  __dirname,
  process.env.FIREBASE_SERVICE_ACCOUNT ||
    "./serviceAccountKey.json"
);

let firebaseReady = false;
let sensorRef = null;
let smsRecipientsRef = null;

try {
  const serviceAccount =
    require(serviceAccountPath);

  const firebaseApp = initializeApp({
    credential: cert(serviceAccount),

    databaseURL:
      "https://rescueiot-default-rtdb.asia-southeast1.firebasedatabase.app"
  });

  firebaseReady = true;

  sensorRef =
    getDatabase(firebaseApp).ref("sensor");

  smsRecipientsRef =
  getDatabase(firebaseApp).ref("smsRecipients");

  console.log(
    "RESCUE-IOT: Firebase Admin initialized."
  );

} catch (error) {

  console.error(
    "RESCUE-IOT: Firebase Admin initialization failed."
  );

  console.error(error.message);
}

// =====================================================
// BASIC ROUTE
// =====================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message:
      "RESCUE-IOT backend is running.",
    firebase:
      firebaseReady
        ? "connected"
        : "not connected"
  });

});

// =====================================================
// PHILSMS
// =====================================================

async function sendSMS(message) {

  const token =
    process.env.PHILSMS_TOKEN;

  // ---------------------------------------------------
  // LOAD SMS RECIPIENTS FROM RTDB
  // ---------------------------------------------------

  // Use Set to automatically remove duplicate phone numbers
  const recipients = new Set();

  if (!smsRecipientsRef) {
    console.error(
      "RESCUE-IOT: SMS recipients RTDB reference is unavailable."
    );

    return false;
  }

  try {

    const snapshot =
      await smsRecipientsRef.once("value");

    const smsRecipients =
      snapshot.val() || {};

    for (
      const [userId, resident]
      of Object.entries(smsRecipients)
    ) {

      if (!resident) {
        continue;
      }

      // SMS must be enabled
      if (resident.smsEnabled !== true) {
        continue;
      }

      // Resident must be active
      if (
        String(resident.status || "").toLowerCase() !==
        "active"
      ) {
        continue;
      }

      // Use the phone field from the resident record
      const rawPhone =
        resident.phone || "";

      if (!rawPhone) {
        continue;
      }

      // Remove spaces, dashes, parentheses, etc.
      let phone =
        String(rawPhone).replace(/\D/g, "");

      // 09XXXXXXXXX → 639XXXXXXXXX
      if (phone.startsWith("09")) {

        phone =
          "63" + phone.substring(1);

      }

      // +639XXXXXXXXX / 639XXXXXXXXX
      else if (phone.startsWith("639")) {

        phone = phone;

      }

      // Reject anything that isn't a Philippine mobile number
      else {

        console.warn(
          `RESCUE-IOT: Invalid Philippine phone number for ${userId}.`
        );

        continue;
      }

      // Validate final Philippine mobile format
      if (!/^639\d{9}$/.test(phone)) {

        console.warn(
          `RESCUE-IOT: Invalid phone number for ${userId}.`
        );

        continue;
      }

      // Add phone number to Set
      // This prevents duplicate SMS messages
      recipients.add(phone);
    }

    console.log(
      `RESCUE-IOT: RTDB SMS recipients found: ${recipients.size}`
    );

  } catch (error) {

    console.error(
      "RESCUE-IOT: Failed to load SMS recipients from RTDB:",
      error.message
    );

    return false;
  }

  const senderId =
    process.env.PHILSMS_SENDER_ID ||
    "PhilSMS";

  // ---------------------------------------------------
  // CHECK TOKEN
  // ---------------------------------------------------

  if (!token) {

    console.error(
      "RESCUE-IOT: PHILSMS_TOKEN is missing."
    );

    return false;
  }

  // ---------------------------------------------------
  // CHECK RECIPIENTS
  // ---------------------------------------------------

  if (recipients.size === 0) {

    console.error(
      "RESCUE-IOT: No SMS recipients configured."
    );

    return false;
  }

  // ---------------------------------------------------
  // SEND TO ALL RECIPIENTS
  // ---------------------------------------------------

  let allSuccessful = true;

  for (const recipient of recipients) {

    try {

      console.log(
        `RESCUE-IOT: Sending SMS to ${recipient}...`
      );

      const response = await fetch(
        "https://dashboard.philsms.com/api/v3/sms/send",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body: JSON.stringify({
            recipient:
              recipient,

            sender_id:
              senderId,

            type:
              "plain",

            message:
              message
          })
        }
      );

      console.log(
        `PhilSMS HTTP status: ${response.status}`
      );

      const responseText =
        await response.text();

      let result = {};

      try {

        result =
          JSON.parse(responseText);

      } catch {

        result = {
          raw_response:
            responseText
        };
      }

      // -------------------------------------------------
      // HTTP ERROR
      // -------------------------------------------------

      if (!response.ok) {

        console.error(
          "RESCUE-IOT: PhilSMS request failed:",
          result
        );

        allSuccessful = false;

        continue;
      }

      // -------------------------------------------------
      // PHILSMS API ERROR
      // -------------------------------------------------

      if (
        result.status &&
        result.status !== "success"
      ) {

        console.error(
          "RESCUE-IOT: PhilSMS rejected SMS:",
          result
        );

        allSuccessful = false;

        continue;
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      console.log(
        `RESCUE-IOT: SMS delivered to ${recipient}.`
      );

    } catch (error) {

      console.error(
        "RESCUE-IOT: SMS sending error:",
        error.message
      );

      allSuccessful = false;
    }
  }

  return allSuccessful;
}

// =====================================================
// STATUS NORMALIZATION
// =====================================================

function normalizeStatus(status) {

  if (!status) {
    return "UNKNOWN";
  }

  const value =
    String(status)
      .trim()
      .toUpperCase();

  if (value === "SAFE") {
    return "SAFE";
  }

  if (
    value === "CAUTION" ||
    value === "WARNING"
  ) {
    return "WARNING";
  }

  if (value === "DANGER") {
    return "DANGER";
  }

  return "UNKNOWN";
}

// =====================================================
// STATUS FROM DISTANCE
// =====================================================
//
// The backend calculates the status from the actual
// ultrasonic distance.
//
// > 50 cm  = SAFE
// > 20 cm  = WARNING
// <= 20 cm = DANGER
//
// This prevents Firebase from temporarily giving us
// a mismatched distance/status pair.
//

function getStatusFromDistance(distance) {

  const value =
    Number(distance);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "UNKNOWN";
  }

  // SAFE
  if (value > 50) {
    return "SAFE";
  }

  // WARNING / CAUTION
  if (value > 20) {
    return "WARNING";
  }

  // DANGER
  return "DANGER";
}

// =====================================================
// SMS MESSAGE GENERATOR
// =====================================================

function createSMSMessage(
  status,
  sensorData
) {

  const distance =
    Number(
      sensorData?.distance
    );

  const distanceText =
    Number.isFinite(distance)
      ? `${distance.toFixed(2)} cm`
      : "unknown distance";

  // ---------------------------------------------------
  // WARNING
  // ---------------------------------------------------

  if (status === "WARNING") {

    return (
      "RESCUE-IOT WARNING: " +
      "Water level has reached the CAUTION level " +
      `(${distanceText}). ` +
      "Please monitor the situation and prepare " +
      "for possible evacuation."
    );
  }

  // ---------------------------------------------------
  // DANGER
  // ---------------------------------------------------

  if (status === "DANGER") {

    return (
      "RESCUE-IOT EMERGENCY: " +
      "DANGER water level detected " +
      `(${distanceText}). ` +
      "Please evacuate immediately using the " +
      "recommended safe route."
    );
  }

  // ---------------------------------------------------
  // SAFE
  // ---------------------------------------------------

  if (status === "SAFE") {

    return (
      "RESCUE-IOT UPDATE: " +
      "Water level has returned to a SAFE condition " +
      `(${distanceText}). ` +
      "Continue monitoring official RESCUE-IOT updates."
    );
  }

  return null;
}

// =====================================================
// ALERT STABILIZATION / ANTI-FLAPPING
// =====================================================

let lastStatus = null;

// Candidate status currently being observed.
let candidateStatus = null;

// Number of consecutive readings for candidate.
let candidateCount = 0;

// Require 3 consecutive readings.
const REQUIRED_CONSECUTIVE_READINGS = 3;

// =====================================================
// SENSOR PROCESSING QUEUE
// =====================================================
//
// Firebase can send another reading while an SMS is
// still being processed.
//
// The queue makes sure every sensor reading is processed
// in order, one at a time.
//

let sensorProcessingQueue =
  Promise.resolve();

// =====================================================
// PROCESS SENSOR STATUS
// =====================================================

async function processStableStatus(sensorData) {

  // ===================================================
  // READ DISTANCE
  // ===================================================

  const distance =
    Number(sensorData?.distance);

  // ===================================================
  // DETERMINE STATUS FROM DISTANCE
  // ===================================================

  const currentStatus =
    getStatusFromDistance(distance);

  // ===================================================
  // IGNORE INVALID READING
  // ===================================================

  if (currentStatus === "UNKNOWN") {

    console.log(
      "RESCUE-IOT: Invalid sensor reading ignored."
    );

    candidateStatus = null;
    candidateCount = 0;

    return;
  }

  // ===================================================
  // INITIAL STATUS
  // ===================================================

  if (lastStatus === null) {

    lastStatus = currentStatus;

    candidateStatus = null;
    candidateCount = 0;

    console.log(
      `RESCUE-IOT: Initial sensor status: ${lastStatus}`
    );

    console.log(
      `RESCUE-IOT: Initial distance: ${distance.toFixed(2)} cm`
    );

    return;
  }

  // ===================================================
  // SAME AS CONFIRMED STATUS
  // ===================================================
  //
  // Example:
  //
  // Confirmed SAFE
  // SAFE
  // SAFE
  // SAFE
  //
  // Do NOT create candidates.
  // Do NOT send SMS.
  // Do NOT print every reading.
  //

  if (currentStatus === lastStatus) {

    // If there was a previous candidate, cancel it.
    if (candidateStatus !== null) {

      console.log(
        `RESCUE-IOT: Candidate ${candidateStatus} cancelled. ` +
        `Reading returned to confirmed ${lastStatus}.`
      );
    }

    candidateStatus = null;
    candidateCount = 0;

    return;
  }

  // ===================================================
  // NEW CANDIDATE STATUS
  // ===================================================

  if (candidateStatus !== currentStatus) {

    candidateStatus = currentStatus;
    candidateCount = 1;

    console.log(
      `RESCUE-IOT: ${candidateStatus} candidate ` +
      `${candidateCount}/${REQUIRED_CONSECUTIVE_READINGS} ` +
      `(${distance.toFixed(2)} cm)`
    );

    return;
  }

  // ===================================================
  // CONTINUE SAME CANDIDATE
  // ===================================================

  candidateCount++;

  // Safety limit.
  if (
    candidateCount >
    REQUIRED_CONSECUTIVE_READINGS
  ) {
    candidateCount =
      REQUIRED_CONSECUTIVE_READINGS;
  }

  console.log(
    `RESCUE-IOT: ${candidateStatus} candidate ` +
    `${candidateCount}/${REQUIRED_CONSECUTIVE_READINGS} ` +
    `(${distance.toFixed(2)} cm)`
  );

  // ===================================================
  // NOT YET STABLE
  // ===================================================

  if (
    candidateCount <
    REQUIRED_CONSECUTIVE_READINGS
  ) {

    return;
  }

  // ===================================================
  // STABLE STATUS CONFIRMED
  // ===================================================

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "RESCUE-IOT STABLE STATUS CHANGE"
  );

  console.log(
    "=========================================="
  );

  console.log(
    `Previous: ${lastStatus}`
  );

  console.log(
    `Current: ${currentStatus}`
  );

  console.log(
    `Distance: ${distance.toFixed(2)} cm`
  );

  // ===================================================
  // CONFIRM STATUS BEFORE SMS
  // ===================================================

  lastStatus =
    currentStatus;

  // IMPORTANT:
  // Clear candidate immediately.
  //
  // This prevents:
  //
  // 3/3
  // 4/3
  // 5/3
  //
  // from happening while SMS is being sent.

  candidateStatus = null;
  candidateCount = 0;

  // ===================================================
  // CREATE SMS MESSAGE
  // ===================================================

  const message =
    createSMSMessage(
      currentStatus,
      {
        ...sensorData,
        distance: distance
      }
    );

  // ===================================================
  // NO MESSAGE
  // ===================================================

  if (!message) {

    console.log(
      "RESCUE-IOT: No SMS message required."
    );

    console.log(
      "=========================================="
    );

    console.log("");

    return;
  }

  // ===================================================
  // SEND SMS
  // ===================================================

  const smsSent =
    await sendSMS(message);

  // ===================================================
  // SMS RESULT
  // ===================================================

  if (smsSent) {

    console.log(
      `RESCUE-IOT: ${currentStatus} SMS sent successfully.`
    );

  } else {

    console.error(
      `RESCUE-IOT: ${currentStatus} SMS failed.`
    );

    console.error(
      "RESCUE-IOT: Status remains confirmed. " +
      "Waiting for the next status change."
    );
  }

  console.log(
    "=========================================="
  );

  console.log("");
}

// =====================================================
// START FIREBASE MONITORING
// =====================================================

async function startFirebaseMonitoring() {

  if (
    !firebaseReady ||
    !sensorRef
  ) {

    console.error(
      "RESCUE-IOT: Firebase monitoring cannot start."
    );

    return;
  }

  console.log(
    "RESCUE-IOT: Starting Firebase sensor monitoring..."
  );

  // ---------------------------------------------------
  // READ INITIAL SENSOR STATE
  // ---------------------------------------------------
  //
  // We wait for this before attaching the listener.
  //
  // This prevents the initial Firebase value from
  // being processed twice.
  //

  try {

    const snapshot =
      await sensorRef.once(
        "value"
      );

    const sensorData =
      snapshot.val() || {};

    const distance =
      Number(
        sensorData?.distance
      );

    const initialStatus =
      getStatusFromDistance(
        distance
      );

    if (
      initialStatus === "UNKNOWN"
    ) {

      lastStatus =
        null;

      console.log(
        "RESCUE-IOT: Initial sensor reading is UNKNOWN."
      );

    } else {

      lastStatus =
        initialStatus;

      candidateStatus =
        null;

      candidateCount =
        0;

      console.log(
        `RESCUE-IOT: Initial sensor status: ${lastStatus}`
      );

      console.log(
        `RESCUE-IOT: Initial distance: ${
          Number.isFinite(distance)
            ? distance
            : "N/A"
        } cm`
      );
    }

  } catch (error) {

    console.error(
      "RESCUE-IOT: Unable to read initial sensor status:",
      error.message
    );

    return;
  }

  // ---------------------------------------------------
  // MONITOR FUTURE SENSOR CHANGES
  // ---------------------------------------------------

  sensorRef.on(
    "value",
    (snapshot) => {

      const sensorData =
        snapshot.val() || {};

      // Add the reading to the processing queue.
      //
      // This guarantees that readings are processed
      // sequentially.
      //

      sensorProcessingQueue =
        sensorProcessingQueue
          .then(() => {

            return processStableStatus(
              sensorData
            );

          })
          .catch((error) => {

            console.error(
              "RESCUE-IOT: Sensor processing error:",
              error.message
            );
          });
    },

    (error) => {

      console.error(
        "RESCUE-IOT: Firebase sensor listener error:",
        error.message
      );
    }
  );

  console.log(
    "RESCUE-IOT: Firebase automatic SMS monitoring is ACTIVE."
  );
}

// =====================================================
// TEST SMS ROUTE
// =====================================================

app.post(
  "/test-sms",
  async (req, res) => {

    try {

      const message =
        req.body?.message ||
        "RESCUE-IOT TEST: SMS notification system is working.";

      const success =
        await sendSMS(
          message
        );

      if (!success) {

        return res.status(500).json({
          success: false,
          message:
            "SMS sending failed."
        });
      }

      return res.json({
        success: true,
        message:
          "SMS sent successfully."
      });

    } catch (error) {

      console.error(
        "RESCUE-IOT: Test SMS error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {

    console.log(
      `RESCUE-IOT backend running on port ${PORT}`
    );

    startFirebaseMonitoring();
  }
);