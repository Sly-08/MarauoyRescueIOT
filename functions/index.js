const {
  onValueUpdated
} = require("firebase-functions/v2/database");

const {
  defineSecret,
  defineString
} = require("firebase-functions/params");

const admin = require("firebase-admin");

admin.initializeApp();


// =====================================================
// SECURE CONFIGURATION
// =====================================================

// PhilSMS API token.
// NEVER put the actual token in this file.
const PHILSMS_TOKEN =
  defineSecret("PHILSMS_TOKEN");

// Sender ID.
const PHILSMS_SENDER_ID =
  defineString(
    "PHILSMS_SENDER_ID",
    {
      default: "PhilSMS"
    }
  );


// =====================================================
// FIREBASE REALTIME DATABASE
// =====================================================

const database =
  admin.database();

const smsRecipientsRef =
  database.ref("smsRecipients");


// =====================================================
// PHONE NUMBER NORMALIZATION
// =====================================================

function normalizePhilippinePhone(
  rawPhone
) {

  if (!rawPhone) {
    return null;
  }

  let phone =
    String(rawPhone)
      .replace(/\D/g, "");

  // 09XXXXXXXXX
  if (
    phone.startsWith("09") &&
    phone.length === 11
  ) {

    phone =
      "63" +
      phone.substring(1);

  }

  // 639XXXXXXXXX
  else if (
    phone.startsWith("639") &&
    phone.length === 12
  ) {

    // Already correct.
  }

  else {

    return null;
  }


  if (
    !/^639\d{9}$/.test(phone)
  ) {

    return null;
  }


  return phone;
}


// =====================================================
// LOAD ACTIVE SMS RECIPIENTS
// =====================================================

async function getSMSRecipients() {

  const snapshot =
    await smsRecipientsRef.once(
      "value"
    );

  const smsRecipients =
    snapshot.val() || {};

  const recipients =
    new Set();


  for (
    const [
      userId,
      resident
    ]
    of Object.entries(
      smsRecipients
    )
  ) {

    if (!resident) {
      continue;
    }


    // Resident must have SMS enabled.
    if (
      resident.smsEnabled !== true
    ) {

      continue;
    }


    // Resident must be active.
    if (
      String(
        resident.status || ""
      )
        .toLowerCase() !==
      "active"
    ) {

      continue;
    }


    const phone =
      normalizePhilippinePhone(
        resident.phone
      );


    if (!phone) {

      console.warn(
        `RESCUE-IOT: Invalid phone number for ${userId}.`
      );

      continue;
    }


    // Set automatically removes duplicates.
    recipients.add(
      phone
    );
  }


  console.log(
    `RESCUE-IOT: Active SMS recipients found: ${recipients.size}`
  );


  return Array.from(
    recipients
  );
}


// =====================================================
// SEND SMS THROUGH PHILSMS
// =====================================================

async function sendPhilSMS(
  message
) {

  const token =
    PHILSMS_TOKEN.value();

  const senderId =
    PHILSMS_SENDER_ID.value();


  if (!token) {

    throw new Error(
      "PHILSMS_TOKEN is not configured."
    );

  }


  const recipients =
    await getSMSRecipients();


  if (
    recipients.length === 0
  ) {

    throw new Error(
      "No active SMS recipients were found in /smsRecipients."
    );

  }


  let allSuccessful =
    true;


  for (
    const recipient
    of recipients
  ) {

    try {

      console.log(
        `RESCUE-IOT: Sending SMS to ${recipient}...`
      );


      const response =
        await fetch(
          "https://app.philsms.com/api/v3/sms/send",
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

            body:
              JSON.stringify({

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
          JSON.parse(
            responseText
          );

      }

      catch {

        result = {
          raw_response:
            responseText
        };

      }


      console.log(
        "PhilSMS response:",
        JSON.stringify(
          result
        )
      );


      if (!response.ok) {

        console.error(
          `RESCUE-IOT: PhilSMS request failed for ${recipient}.`,
          result
        );

        allSuccessful =
          false;

        continue;
      }


      if (
        result.status &&
        result.status !==
          "success"
      ) {

        console.error(
          `RESCUE-IOT: PhilSMS rejected SMS for ${recipient}.`,
          result
        );

        allSuccessful =
          false;

        continue;
      }


      console.log(
        `RESCUE-IOT: SMS request accepted for ${recipient}.`
      );

    }

    catch (error) {

      console.error(
        `RESCUE-IOT: SMS sending error for ${recipient}:`,
        error.message
      );

      allSuccessful =
        false;
    }
  }


  return allSuccessful;
}


// =====================================================
// FLOOD STATUS → SMS
// =====================================================

exports.sendFloodAlert =
  onValueUpdated(
    {
      ref:
        "/sensor/status",

      region:
        "asia-southeast1",

      secrets: [
        PHILSMS_TOKEN
      ]
    },

    async (event) => {

      const before =
        String(
          event.data.before.val() || ""
        )
          .trim()
          .toUpperCase();


      const after =
        String(
          event.data.after.val() || ""
        )
          .trim()
          .toUpperCase();


      console.log(
        `RESCUE-IOT: Water status changed: ${before} → ${after}`
      );


      // =================================================
      // IGNORE DUPLICATE STATUS
      // =================================================

      if (
        before === after
      ) {

        console.log(
          "RESCUE-IOT: Status unchanged. No SMS sent."
        );

        return null;
      }


      let message =
        null;


      // =================================================
      // WARNING / CAUTION
      // =================================================

      if (
        after === "WARNING" ||
        after === "CAUTION"
      ) {

        message =
          "RESCUE-IOT WARNING: Water level in Barangay Marauoy has reached a warning condition. Please remain alert and prepare for possible evacuation.";
      }


      // =================================================
      // DANGER
      // =================================================

      else if (
        after === "DANGER"
      ) {

        message =
          "RESCUE-IOT EMERGENCY: Critical water level detected in Barangay Marauoy. Please evacuate immediately and proceed to a safe location.";
      }


      // =================================================
      // SAFE / RECOVERY
      // =================================================

      else if (
        after === "SAFE"
      ) {

        // Only send recovery SMS when
        // there was a previous alert.

        if (
          before !== "DANGER" &&
          before !== "WARNING" &&
          before !== "CAUTION"
        ) {

          console.log(
            "RESCUE-IOT: SAFE status detected without previous alert. No recovery SMS."
          );

          return null;
        }


        message =
          "RESCUE-IOT ALERT: Water level has returned to safe conditions in Barangay Marauoy.";
      }


      // =================================================
      // UNKNOWN STATUS
      // =================================================

      else {

        console.log(
          `RESCUE-IOT: Unknown water status "${after}". No SMS sent.`
        );

        return null;
      }


      // =================================================
      // SEND SMS
      // =================================================

      console.log(
        "RESCUE-IOT: Sending flood alert SMS..."
      );


      const success =
        await sendPhilSMS(
          message
        );


      if (!success) {

        throw new Error(
          "One or more SMS requests failed."
        );

      }


      console.log(
        "RESCUE-IOT: Flood alert SMS processing completed."
      );


      return null;
    }
  );