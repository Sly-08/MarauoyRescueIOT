import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

(function () {

  "use strict";

  if (!App.initPage(
    "alerts",
    "Alert Center",
    "Notification feed, channels, and manual announcements"
  )) {

    return;

  }

  window.Alerts = {

    filter: "all",

    pendingBroadcast: null,

    firestoreUnsubscribe: null,

    /* =======================================================

       INITIALIZATION

       ======================================================== */

    async init() {

      try {

        if (
          window.RescueData &&
          typeof RescueData.initializeFromFirestore ===
          "function"
        ) {

          await RescueData.initializeFromFirestore();

        }

      } catch (error) {

        console.error(
          "RESCUE-IOT: Unable to initialize RescueData before Alert Center.",
          error
        );

      }

      await this.loadAlertChannelsFromFirebase();

      await this.loadAlertsFromFirebase();

      this.render();

    },

    /* =======================================================

       FIREBASE HELPERS

       ======================================================== */

    getDB() {

      return window.firebaseDB ||
        window.firebaseFirestore ||
        window.firestoreDB ||
        window.db ||
        null;

    },

    /* =======================================================

       ALERT CHANNELS FIREBASE

       ======================================================== */

    async loadAlertChannelsFromFirebase() {

      const db =
        this.getDB();

      if (!db) {

        console.error(
          "Firebase Firestore is not available."
        );

        return;

      }

      try {

        const channelsRef =
          collection(
            db,
            "alertChannels"
          );

        const snapshot =
          await getDocs(
            channelsRef
          );

        const firestoreChannels =
          snapshot.docs.map(
            (item) => {

              const data =
                item.data() || {};

              return {

                id:
                  data.id ||
                  item.id,

                name:
                  data.name ||
                  "Unnamed Channel",

                note:
                  data.note ||
                  "",

                status:
                  data.status ||
                  "Ready"

              };

            }
          );

        if (
          window.RescueData
        ) {

          if (
            Array.isArray(
              RescueData.alertChannels
            )
          ) {

            RescueData.alertChannels.splice(
              0,
              RescueData.alertChannels.length,
              ...firestoreChannels
            );

          } else {

            RescueData.alertChannels =
              firestoreChannels;

          }

        }

      } catch (error) {

        console.error(
          "Unable to load alert channels from Firebase:",
          error
        );

      }

    },

    async saveAlertChannels() {

      const db =
        this.getDB();

      if (!db) {

        console.error(
          "Firebase Firestore is not available."
        );

        return;

      }

      try {

        const channels =
          this.getChannels();

        await Promise.all(

          channels.map(
            async (channel) => {

              if (
                !channel ||
                !channel.id
              ) {

                return;

              }

              await setDoc(

                doc(
                  db,
                  "alertChannels",
                  String(channel.id)
                ),

                {

                  ...channel,

                  updatedAt:
                    serverTimestamp()

                },

                {
                  merge: true
                }

              );

            }
          )

        );

      } catch (error) {

        console.error(
          "Unable to save alert channels:",
          error
        );

      }

    },

    async addAlertChannel(event) {

      event.preventDefault();

      const name =
        document.getElementById(
          "new-channel-name"
        )?.value.trim();

      const note =
        document.getElementById(
          "new-channel-note"
        )?.value.trim();

      const status =
        document.getElementById(
          "new-channel-status"
        )?.value ||
        "Ready";

      if (!name) {

        App.toast(
          "Please enter an alert channel name.",
          "warning"
        );

        return;

      }

      const channel = {

        id:
          "CHANNEL-" +
          Date.now(),

        name,

        note:
          note ||
          "Alert notification channel",

        status,

        createdAt:
          new Date().toISOString()

      };

      if (
        !Array.isArray(
          RescueData.alertChannels
        )
      ) {

        RescueData.alertChannels =
          [];

      }

      RescueData.alertChannels.push(
        channel
      );

      const db =
        this.getDB();

      if (!db) {

        App.toast(
          "Firebase database is unavailable.",
          "danger"
        );

        return;

      }

      try {

        await setDoc(

          doc(
            db,
            "alertChannels",
            String(channel.id)
          ),

          {

            ...channel,

            firebaseCreatedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }

        );

        App.toast(
          `${name} alert channel added successfully.`,
          "success"
        );

        this.render();

      } catch (error) {

        console.error(
          "Unable to add alert channel:",
          error
        );

        App.toast(
          "Unable to add the alert channel.",
          "danger"
        );

      }

    },

    async loadAlertsFromFirebase() {

      const db =
        this.getDB();

      if (!db) {

        console.error(
          "Firebase Firestore is not available."
        );

        this.render();

        return;

      }

      try {

        const alertsRef =
          collection(
            db,
            "alerts"
          );

        /*
         * Do not use orderBy("createdAt").
         *
         * Alerts created by data.js may use "time"
         * instead of "createdAt".
         */

        if (
          typeof this.firestoreUnsubscribe ===
          "function"
        ) {

          this.firestoreUnsubscribe();

        }

        this.firestoreUnsubscribe =
          onSnapshot(

            alertsRef,

            (snapshot) => {

              const firestoreAlerts =
                snapshot.docs
                  .map(
                    (item) => {

                      const data =
                        item.data() || {};

                      return {

                        id:
                          data.id ||
                          item.id,

                        type:
                          data.type ||
                          "info",

                        level:
                          data.level ||
                          "Info",

                        sensor:
                          data.sensor ||
                          data.sensorId ||
                          "Unknown",

                        sensorId:
                          data.sensorId ||
                          "",

                        barangay:
                          data.barangay ||
                          "Unknown",

                        message:
                          data.message ||
                          "",

                        channels:
                          Array.isArray(
                            data.channels
                          )
                            ? data.channels
                            : [],

                        time:
                          data.time ||
                          data.createdAt ||
                          "",

                        createdAt:
                          data.createdAt ||
                          data.time ||
                          "",

                        acknowledged:
                          Boolean(
                            data.acknowledged
                          ),

                        acknowledgedBy:
                          Array.isArray(
                            data.acknowledgedBy
                          )
                            ? data.acknowledgedBy
                            : [],

                        acknowledgedAt:
                          data.acknowledgedAt ||
                          null

                      };

                    }
                  )
                  .sort(
                    (a, b) => {

                      const dateA =
                        new Date(
                          a.createdAt ||
                          a.time ||
                          0
                        );

                      const dateB =
                        new Date(
                          b.createdAt ||
                          b.time ||
                          0
                        );

                      return (
                        dateB.getTime() -
                        dateA.getTime()
                      );

                    }
                  );

              if (
  !Array.isArray(
    RescueData.alerts
  )
) {
  RescueData.alerts = [];
}

RescueData.alerts.splice(
  0,
  RescueData.alerts.length,
  ...firestoreAlerts
);

this.render();

            },

            (error) => {

              console.error(
                "Unable to listen to Firebase alerts:",
                error
              );

              this.render();

            }

          );

      } catch (error) {

        console.error(
          "Unable to load Firebase alerts:",
          error
        );

        this.render();

      }

    },

    /* =======================================================

       HELPERS

       ======================================================== */

    escape(value) {

      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    },

    getRoot() {

      return document.getElementById(
        "alerts-root"
      );

    },

    getAlerts() {

      return Array.isArray(
        RescueData.alerts
      )
        ? RescueData.alerts
        : [];

    },

    getFilteredAlerts() {

      const alerts =
        this.getAlerts();

      if (this.filter === "all") {

        return alerts;

      }

      return alerts.filter(
        (alert) => {

          return String(
            alert.type || ""
          ).toLowerCase() ===
            String(
              this.filter
            ).toLowerCase();

        }
      );

    },

    getCurrentStatus() {

      if (
        typeof RescueData.status ===
        "function"
      ) {

        return RescueData.status();

      }

      return {

        key: "safe",

        label: "Safe",

        action:
          "Continue monitoring official updates."

      };

    },

    getBarangayName() {

      if (
        RescueData.study &&
        typeof RescueData.study.primaryBarangay !==
        "undefined"
      ) {

        return RescueData.study.primaryBarangay;

      }

      if (
        RescueData.primaryBarangay
      ) {

        return RescueData.primaryBarangay;

      }

      return "Unknown Barangay";

    },

    getSystemValue(
      key,
      fallback = "N/A"
    ) {

      if (
        RescueData.system &&
        typeof RescueData.system[key] !==
        "undefined"
      ) {

        return RescueData.system[key];

      }

      return fallback;

    },

    getChannels() {

      return Array.isArray(
        RescueData.alertChannels
      )
        ? RescueData.alertChannels
        : [];

    },

    getRoutes() {

      if (
        typeof RescueData.getRoutes ===
        "function"
      ) {

        const routes =
          RescueData.getRoutes();

        return Array.isArray(
          routes
        )
          ? routes
          : [];

      }

      return Array.isArray(
        RescueData.routes
      )
        ? RescueData.routes
        : [];

    },

    async saveAlerts() {

      const db =
        this.getDB();

      if (!db) {

        console.error(
          "Firebase Firestore is not available."
        );

        return;

      }

      try {

        const alerts =
          this.getAlerts();

        await Promise.all(

          alerts.map(

            async (alert) => {

              if (
                !alert ||
                !alert.id
              ) {

                return;

              }

              await setDoc(

                doc(
                  db,
                  "alerts",
                  String(alert.id)
                ),

                {

                  ...alert,

                  updatedAt:
                    serverTimestamp()

                },

                {
                  merge: true
                }

              );

            }

          )

        );

      } catch (error) {

        console.error(
          "Unable to save alerts to Firebase:",
          error
        );

      }

    },

    /* =======================================================

       MAIN RENDER

       ======================================================== */

    render() {

      const root =
        this.getRoot();

      if (!root) {

        console.error(
          "Alert root element not found."
        );

        return;

      }

      try {

        const session =
          App.getSession() || {};

        const alerts =
          this.getFilteredAlerts();

        const currentStatus =
          this.getCurrentStatus();

        if (
          session.role === "resident"
        ) {

          this.renderResident(
            alerts,
            currentStatus
          );

          return;

        }

        if (
          session.role === "responder"
        ) {

          this.renderResponder(
            alerts,
            currentStatus
          );

          return;

        }

        this.renderAdmin(
          alerts,
          currentStatus
        );

      } catch (error) {

        console.error(
          "Alert Center render error:",
          error
        );

        root.innerHTML = `
          <section class="card card-pad">

            <h3>Alert Center</h3>

            <p class="text-2">

              The Alert Center could not load its data.

              Please refresh the page.

            </p>

            <button
              type="button"
              class="btn btn-primary"
              onclick="Alerts.render()">

              Retry

            </button>

          </section>
        `;

      }

    },

    /* =======================================================

       ADMIN VIEW

       ======================================================== */

    renderAdmin(
      alerts,
      currentStatus
    ) {

      const root =
        this.getRoot();

      const barangay =
        this.getBarangayName();

      const statusKey =
        currentStatus &&
        currentStatus.key
          ? currentStatus.key
          : "safe";

      const statusLabel =
        currentStatus &&
        currentStatus.label
          ? currentStatus.label
          : "Safe";

      const statusAction =
        currentStatus &&
        currentStatus.action
          ? currentStatus.action
          : "Continue monitoring official updates.";

      root.innerHTML = `

        <section class="stack">

          <div class="active-alert ${this.escape(statusKey)}">

            <span class="badge ${this.escape(statusKey)}">

              <span class="dot"></span>

              Active ${this.escape(statusLabel)}

            </span>

            <h2 style="margin-top:10px">

              ${this.escape(barangay)}
              Creek is at

              ${this.escape(
                statusLabel.toUpperCase()
              )}

              level

            </h2>

            <p class="text-2">

              ${this.escape(statusAction)}

              Verified updates are sent through app,
              SMS, local siren, warning lights,
              and dashboard.

            </p>

          </div>

          <section class="layout-2">

            <div class="stack">

              <article class="card card-pad">

                <div class="card-header">

                  <h3>Alert Feed</h3>

                  <div class="filter-row">

                    ${this.filterButtons()}

                  </div>

                </div>

                <div class="timeline">

                  ${
                    alerts.length

                      ? alerts
                        .map(
                          (alert) =>
                            this.alertItem(
                              alert,
                              "admin"
                            )
                        )
                        .join("")

                      : `

                        <div class="empty-state">

                          No alerts found.

                        </div>

                      `
                  }

                </div>

              </article>

              ${this.routeAdvisory("admin")}

            </div>

            <aside class="stack">

              <article class="card card-pad">

                <h3 style="margin-bottom:12px">

                  Alert Channels Status

                </h3>

                <div class="stack-sm">

                  ${this.renderChannels()}

                </div>

              </article>

              ${this.alertChannelForm()}

              ${this.adminBroadcastForm()}

            </aside>

          </section>

        </section>

      `;

    },

    /* =======================================================

       ALERT CHANNEL FORM

       ======================================================== */

    alertChannelForm() {

      return `

        <article class="card card-pad">

          <h3 style="margin-bottom:12px">

            Add Alert Channel

          </h3>

          <form
            class="stack-sm"
            onsubmit="Alerts.addAlertChannel(event)">

            <label class="form-group">

              <span class="form-label">

                Channel Name

              </span>

              <input
                id="new-channel-name"
                type="text"
                required>

            </label>

            <label class="form-group">

              <span class="form-label">

                Description

              </span>

              <input
                id="new-channel-note"
                type="text"
                placeholder="Example: SMS emergency notifications">

            </label>

            <label class="form-group">

              <span class="form-label">

                Status

              </span>

              <select
                id="new-channel-status"
                class="form-select">

                <option value="Ready">

                  Ready

                </option>

                <option value="Unstable">

                  Unstable

                </option>

                <option value="Offline">

                  Offline

                </option>

              </select>

            </label>

            <button
              class="btn btn-primary"
              type="submit">

              Add Alert Channel

            </button>

          </form>

        </article>

      `;

    },

    /* =======================================================

       RESIDENT VIEW

       ======================================================== */

    renderResident(
      alerts,
      currentStatus
    ) {

      const root =
        this.getRoot();

      const statusKey =
        currentStatus?.key ||
        "safe";

      const statusLabel =
        currentStatus?.label ||
        "Safe";

      const statusAction =
        currentStatus?.action ||
        "Continue monitoring official updates.";

      root.innerHTML = `

        <section class="mobile-app-shell">

          <div class="mobile-app resident-alerts-app">

            ${App.residentTopBar(currentStatus)}

            <section
              class="mobile-card resident-alert-summary ${this.escape(statusKey)}">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Current Warning

                </span>

                <span class="badge ${this.escape(statusKey)}">

                  <span class="dot"></span>

                  ${this.escape(statusLabel)}

                </span>

              </div>

              <h2>

                ${
                  statusKey === "danger"
                    ? "Evacuate immediately"
                    : "Monitor official alerts"
                }

              </h2>

              <p>

                ${this.escape(statusAction)}

              </p>

            </section>

            <section class="resident-alert-actions">

              <button
                type="button"
                class="btn btn-danger"
                onclick="Alerts.residentHelp()">

                ${App.icons.phone}

                Need Assistance

              </button>

              <button
                type="button"
                class="btn btn-primary"
                onclick="Alerts.residentSafe()">

                ${App.icons.shield}

                I Am Safe

              </button>

            </section>

            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Alert Inbox

                </span>

                <div class="filter-row compact">

                  ${this.filterButtons()}

                </div>

              </div>

              <div class="mobile-alert-list">

                ${
                  alerts.length

                    ? alerts
                      .map(
                        (alert) =>
                          this.mobileAlertItem(alert)
                      )
                      .join("")

                    : `

                      <div class="empty-state">

                        No alerts available.

                      </div>

                    `
                }

              </div>

            </section>

            <section class="mobile-card featured">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Offline Reminder

                </span>

                ${App.statusBadge(
                  "safe",
                  "Ready"
                )}

              </div>

              <div class="mobile-mini-grid">

                <span>

                  <strong>

                    ${this.escape(
                      this.getSystemValue(
                        "gsm",
                        "Ready"
                      )
                    )}

                  </strong>

                  <small>SMS</small>

                </span>

                <span>

                  <strong>

                    ${this.escape(
                      this.getSystemValue(
                        "siren",
                        "Ready"
                      )
                    )}

                  </strong>

                  <small>siren</small>

                </span>

                <span>

                  <strong>

                    ${this.escape(
                      this.getSystemValue(
                        "lights",
                        "Ready"
                      )
                    )}

                  </strong>

                  <small>lights</small>

                </span>

              </div>

            </section>

            ${App.residentBottomNav("alerts")}

          </div>

        </section>

      `;

    },

    /* =======================================================

       RESPONDER VIEW

       ======================================================== */

    renderResponder(
      alerts,
      currentStatus
    ) {

      const root =
        this.getRoot();

      const rescueRequests =
        typeof RescueData.openRescueRequests ===
        "function"
          ? RescueData.openRescueRequests()
          : [];

      const firstAlert =
        alerts[0] ||
        this.getAlerts()[0];

      const statusKey =
        currentStatus?.key ||
        "safe";

      const statusLabel =
        currentStatus?.label ||
        "Safe";

      const statusAction =
        currentStatus?.action ||
        "Continue monitoring official updates.";

      root.innerHTML = `

        <section class="mobile-app-shell">

          <div class="mobile-app responder-app">

            ${App.responderTopBar(currentStatus)}

            <section
              class="mobile-card responder-alert-command ${this.escape(statusKey)}">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Responder Alerts

                </span>

                <span class="badge ${this.escape(statusKey)}">

                  <span class="dot"></span>

                  ${this.escape(statusLabel)}

                </span>

              </div>

              <h2>

                ${
                  statusKey === "danger"
                    ? "Prioritize evacuation calls"
                    : "Monitor and acknowledge"
                }

              </h2>

              <p>

                ${this.escape(statusAction)}

              </p>

            </section>

            <section class="responder-action-grid-mobile compact">

              <button
                type="button"
                class="primary"

                ${
                  firstAlert
                    ? `onclick="Alerts.acknowledge('${this.escape(firstAlert.id)}')"`
                    : "disabled"
                }>

                ${App.icons.bell}

                <span>

                  Acknowledge

                </span>

              </button>

              <button
                type="button"
                onclick="Alerts.quickFieldUpdate()">

                ${App.icons.send}

                <span>

                  Field Update

                </span>

              </button>

            </section>

            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Rescue Queue

                </span>

                ${App.statusBadge(
                  rescueRequests.length
                    ? "danger"
                    : "safe",

                  `${rescueRequests.length} Open`
                )}

              </div>

              <div class="mobile-alert-list">

                ${
                  rescueRequests.length

                    ? rescueRequests
                      .map(
                        (request) =>
                          this.rescueRequestItem(
                            request
                          )
                      )
                      .join("")

                    : `

                      <div class="empty-state">

                        No open rescue requests.

                      </div>

                    `
                }

              </div>

            </section>

            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">

                  Alert Queue

                </span>

                <div class="filter-row compact">

                  ${this.filterButtons()}

                </div>

              </div>

              <div class="mobile-alert-list">

                ${
                  alerts.length

                    ? alerts
                      .map(
                        (alert) =>
                          this.mobileResponderAlert(
                            alert
                          )
                      )
                      .join("")

                    : `

                      <div class="empty-state">

                        No alerts available.

                      </div>

                    `
                }

              </div>

            </section>

            <section class="mobile-card">

              ${this.responderForm()}

            </section>

            ${App.responderBottomNav("alerts")}

          </div>

        </section>

      `;

    },

    /* =======================================================

       ALERT ITEMS

       ======================================================== */

    alertItem(
      alert,
      role
    ) {

      const responderAction =
        role === "responder" &&
        alert.type !== "safe"
          ? `

            <button
              type="button"
              class="btn btn-secondary"
              style="margin-top:10px"
              onclick="Alerts.acknowledge('${this.escape(alert.id)}')">

              Acknowledge

            </button>

          `
          : "";

      return `

        <div class="timeline-item ${this.escape(alert.type)}">

          <div class="timeline-time">

            ${this.escape(alert.time)}

            -

            ${this.escape(alert.level)}

            -

            ${this.escape(alert.sensor)}

          </div>

          <div class="timeline-title">

            ${this.escape(alert.message)}

          </div>

          <div class="timeline-desc">

            Channels:

            ${
              Array.isArray(alert.channels)

                ? alert.channels
                  .map(
                    (channel) =>
                      this.escape(channel)
                  )
                  .join(", ")

                : "None"
            }

          </div>

          ${responderAction}

        </div>

      `;

    },

    mobileAlertItem(alert) {

      return `

        <article
          class="mobile-alert-item ${this.escape(alert.type)}">

          <div>

            <strong>

              ${this.escape(alert.level)}

            </strong>

            <span>

              ${this.escape(alert.time)}

            </span>

          </div>

          <p>

            ${this.escape(alert.message)}

          </p>

          <small>

            ${
              Array.isArray(alert.channels)

                ? alert.channels
                  .map(
                    (channel) =>
                      this.escape(channel)
                  )
                  .join(" + ")

                : "No channel information"
            }

          </small>

        </article>

      `;

    },

    mobileResponderAlert(alert) {

      return `

        <article
          class="mobile-alert-item ${this.escape(alert.type)}">

          <div>

            <strong>

              ${this.escape(alert.level)}

            </strong>

            <span>

              ${this.escape(alert.time)}

            </span>

          </div>

          <p>

            ${this.escape(alert.message)}

          </p>

          <small>

            ${
              Array.isArray(alert.channels)

                ? alert.channels
                  .map(
                    (channel) =>
                      this.escape(channel)
                  )
                  .join(" + ")

                : "No channel information"
            }

          </small>

          ${
            alert.type !== "safe"

              ? `

                <button
                  type="button"
                  class="btn btn-secondary"
                  onclick="Alerts.acknowledge('${this.escape(alert.id)}')">

                  Acknowledge

                </button>

              `

              : ""
          }

        </article>

      `;

    },

    rescueRequestItem(request) {

      const priority =
        String(
          request.priority || ""
        ).toLowerCase();

      const type =
        priority === "critical"
          ? "danger"
          : "warning";

      return `

        <article
          class="mobile-alert-item ${type}">

          <div>

            <strong>

              ${this.escape(request.reporter)}

              -

              ${this.escape(request.type)}

            </strong>

            <span>

              ${this.escape(request.time)}

            </span>

          </div>

          <p>

            ${this.escape(request.location)}:

            ${this.escape(request.note)}

          </p>

          <small>

            Status:

            ${this.escape(request.status)}

          </small>

          <button
            type="button"
            class="btn btn-secondary"
            onclick="Alerts.assignRequest('${this.escape(request.id)}')">

            Assign

          </button>

        </article>

      `;

    },

    /* =======================================================

       FILTER BUTTONS

       ======================================================== */

    filterButtons() {

      return [

        "all",

        "warning",

        "danger",

        "info"

      ]
        .map(
          (type) => `

            <button
              type="button"
              class="${this.filter === type ? "active" : ""}"
              onclick="Alerts.setFilter('${type}')">

              ${this.escape(type)}

            </button>

          `
        )
        .join("");

    },

    /* =======================================================

       CHANNELS

       ======================================================== */

    renderChannels() {

      const channels =
        this.getChannels();

      if (!channels.length) {

        return `

          <div class="empty-state">

            No alert channels configured.

          </div>

        `;

      }

      return channels
        .map(
          (channel) => `

            <div class="channel-card">

              <span>

                <strong>

                  ${this.escape(channel.name)}

                </strong>

                <br>

                <span class="muted">

                  ${this.escape(channel.note)}

                </span>

              </span>

              ${App.statusBadge(
                this.channelType(
                  channel.status
                ),

                this.escape(
                  channel.status ||
                  "Unknown"
                )
              )}

            </div>

          `
        )
        .join("");

    },

    channelType(status) {

      const value =
        String(
          status || ""
        ).toLowerCase();

      if (value === "unstable") {

        return "warning";

      }

      if (
        value === "offline" ||
        value === "failed"
      ) {

        return "danger";

      }

      return "safe";

    },

    /* =======================================================

       EVACUATION ROUTES

       ======================================================== */

    routeAdvisory(role) {

      const title =
        role === "resident"
          ? "Recommended Evacuation Route"
          : "Evacuation Route Advisory";

      const routes =
        this.getRoutes();

      return `

        <article class="card card-pad">

          <h3 style="margin-bottom:12px">

            ${this.escape(title)}

          </h3>

          <div class="stack-sm">

            ${
              routes.length

                ? routes
                  .map(
                    (route) => {

                      const status =
                        String(
                          route.status ||
                          "Unknown"
                        );

                      const normalizedStatus =
                        status.toLowerCase();

                      const badge =
                        normalizedStatus ===
                        "blocked"

                          ? "danger"

                          : (
                              normalizedStatus ===
                              "danger" ||

                              normalizedStatus ===
                              "critical"
                            )

                            ? "danger"

                            : (
                                normalizedStatus ===
                                "caution" ||

                                normalizedStatus ===
                                "warning" ||

                                normalizedStatus ===
                                "recommended"
                              )

                              ? "warning"

                              : "safe";

                      const routeName =
                        route.name ||
                        "Unnamed Route";

                      const routeLocation =
                        route.barangay ||
                        route.from ||
                        "";

                      const routeDestination =
                        route.to ||
                        "";

                      const routeDescription =
                        route.description ||
                        route.instruction ||
                        "";

                      const routeDistance =
                        route.distance ||
                        "";

                      return `

                        <div class="route-card">

                          <div>

                            <strong>

                              ${this.escape(
                                routeName
                              )}

                              ${
                                routeLocation

                                  ? ` - ${this.escape(
                                      routeLocation
                                    )}`

                                  : ""
                              }

                              ${
                                routeDestination

                                  ? ` to ${this.escape(
                                      routeDestination
                                    )}`

                                  : ""
                              }

                            </strong>

                            ${
                              routeDescription ||
                              routeDistance

                                ? `

                                  <br>

                                  <span class="muted">

                                    ${
                                      routeDistance

                                        ? this.escape(
                                            routeDistance
                                          )

                                        : ""
                                    }

                                    ${
                                      routeDistance &&
                                      routeDescription

                                        ? " - "

                                        : ""
                                    }

                                    ${
                                      routeDescription

                                        ? this.escape(
                                            routeDescription
                                          )

                                        : ""
                                    }

                                  </span>

                                `

                                : ""
                            }

                          </div>

                          ${App.statusBadge(
                            badge,

                            this.escape(
                              status
                            )
                          )}

                        </div>

                      `;

                    }
                  )
                  .join("")

                : `

                  <div class="empty-state">

                    No evacuation routes available.

                  </div>

                `
            }

          </div>

        </article>

      `;

    },

    /* =======================================================

       ADMIN BROADCAST

       ======================================================== */

    adminBroadcastForm() {

      const channels =
        this.getChannels();

      return `

        <article class="card card-pad">

          <h3 style="margin-bottom:12px">

            Official Broadcast

          </h3>

          <form
            class="stack-sm"
            onsubmit="Alerts.sendAdmin(event)">

            <label class="form-group">

              <span class="form-label">

                Message

              </span>

              <textarea
                id="admin-message"
                required></textarea>

            </label>

            <label class="form-group">

              <span class="form-label">

                Priority

              </span>

              <select
                id="admin-priority"
                class="form-select">

                <option value="Info">

                  Info

                </option>

                <option
                  value="Warning"
                  selected>

                  Warning

                </option>

                <option value="Critical">

                  Critical

                </option>

              </select>

            </label>

            <div class="grid-2">

              ${
                channels.length

                  ? channels
                    .map(
                      (channel) => `

                        <label class="check">

                          <input
                            type="checkbox"
                            class="admin-alert-channel"
                            value="${this.escape(channel.name)}"
                            checked>

                          ${this.escape(channel.name)}

                        </label>

                      `
                    )
                    .join("")

                  : `

                    <p class="muted">

                      No alert channels are configured.

                    </p>

                  `
              }

            </div>

            <button
              class="btn btn-danger"
              type="submit">

              ${App.icons.send}

              Send Official Alert

            </button>

          </form>

        </article>

      `;

    },

    /* =======================================================

       RESPONDER FORM

       ======================================================== */

    responderForm() {

      return `

        <div>

          <div class="mobile-card-head">

            <span class="eyebrow">

              Field Update

            </span>

            ${App.statusBadge(
              "info",
              "Responder"
            )}

          </div>

          <form
            class="stack-sm"
            onsubmit="Alerts.sendResponder(event)">

            <label class="form-group">

              <span class="form-label">

                Update Type

              </span>

              <select
                id="field-update-type"
                class="form-select">

                <option>

                  Road Status

                </option>

                <option>

                  Evacuation Center

                </option>

                <option>

                  Resident Assistance

                </option>

                <option>

                  Sensor Observation

                </option>

              </select>

            </label>

            <label class="form-group">

              <span class="form-label">

                Field Note

              </span>

              <textarea
                id="field-message"
                required></textarea>

            </label>

            <button
              class="btn btn-primary"
              type="submit">

              ${App.icons.send}

              Send Field Update

            </button>

          </form>

        </div>

      `;

    },

    /* =======================================================

       FILTERING

       ======================================================== */

    setFilter(type) {

      const allowed = [

        "all",

        "warning",

        "danger",

        "info"

      ];

      this.filter =
        allowed.includes(type)
          ? type
          : "all";

      this.render();

    },

    /* =======================================================

       ADMIN ALERT SENDING

       ======================================================== */

    sendAdmin(event) {

      event.preventDefault();

      const message =
        document.getElementById(
          "admin-message"
        )?.value.trim();

      const priority =
        document.getElementById(
          "admin-priority"
        )?.value ||
        "Warning";

      const selectedChannels =
        Array.from(
          document.querySelectorAll(
            ".admin-alert-channel:checked"
          )
        )
        .map(
          (input) =>
            input.value
        );

      if (!message) {

        App.toast(
          "Please enter an alert message.",
          "warning"
        );

        return;

      }

      if (!selectedChannels.length) {

        App.toast(
          "Select at least one alert channel.",
          "warning"
        );

        return;

      }

      this.pendingBroadcast = {

        message,

        priority,

        channels:
          selectedChannels

      };

      App.showModal(

        "Confirm Official Alert",

        `

          <p class="text-2">

            Send this verified announcement
            to the selected channels?

          </p>

          <div
            class="sample-alert"
            style="margin-top:12px">

            ${this.escape(message)}

          </div>

          <p style="margin-top:12px">

            <strong>

              Priority:

            </strong>

            ${this.escape(priority)}

          </p>

          <p>

            <strong>

              Channels:

            </strong>

            ${selectedChannels
              .map(
                (channel) =>
                  this.escape(channel)
              )
              .join(", ")}

          </p>

        `,

        `

          <button
            type="button"
            class="btn btn-secondary"
            onclick="App.closeModal()">

            Cancel

          </button>

          <button
            type="button"
            class="btn btn-danger"
            onclick="Alerts.confirmAdminAlert()">

            Confirm Send

          </button>

        `

      );

    },

    async confirmAdminAlert() {

      const broadcast =
        this.pendingBroadcast;

      if (!broadcast) {

        App.closeModal();

        return;

      }

      const session =
        App.getSession() || {};

      const priority =
        String(
          broadcast.priority ||
          "Info"
        );

      const priorityLower =
        priority.toLowerCase();

      const type =
        priorityLower === "critical"

          ? "danger"

          : priorityLower === "warning"

            ? "warning"

            : "info";

      const now =
        new Date();

      const alert = {

        id:
          "ALT-" +
          Date.now(),

        type,

        level:
          priority,

        sensor:
          "Admin Broadcast",

        message:
          broadcast.message,

        channels:
          broadcast.channels,

        time:
          now.toLocaleString(
            "en-PH"
          ),

        createdAt:
          now.toISOString(),

        acknowledgedBy: []

      };

      const db =
        this.getDB();

      if (!db) {

        App.toast(
          "Firebase database is unavailable.",
          "danger"
        );

        return;

      }

      try {

        await setDoc(

          doc(
            db,
            "alerts",
            alert.id
          ),

          {

            ...alert,

            firebaseCreatedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }

        );

        if (
          Array.isArray(
            RescueData.communityUpdates
          )
        ) {

          RescueData.communityUpdates.unshift({

            time:
              now.toLocaleString(
                "en-PH"
              ),

            author:
              session.name ||
              "Administrator",

            title:
              `${priority} Alert`,

            message:
              broadcast.message

          });

        }

        this.pendingBroadcast =
          null;

        App.closeModal();

        App.toast(
          "Official alert sent successfully.",
          "warning"
        );

      } catch (error) {

        console.error(
          "Unable to save official alert:",
          error
        );

        App.toast(
          "Unable to send the official alert.",
          "danger"
        );

      }

    },

    /* =======================================================

       RESPONDER FIELD UPDATE

       ======================================================== */

    async sendResponder(event) {

      event.preventDefault();

      const type =
        document.getElementById(
          "field-update-type"
        )?.value ||
        "Field Update";

      const message =
        document.getElementById(
          "field-message"
        )?.value.trim();

      if (!message) {

        App.toast(
          "Please enter a field update.",
          "warning"
        );

        return;

      }

      const session =
        App.getSession() || {};

      const now =
        new Date();

      const fieldUpdate = {

        id:
          "FIELD-" +
          Date.now(),

        type,

        message,

        responder:
          session.name ||
          session.email ||
          "Responder",

        time:
          now.toLocaleString(
            "en-PH"
          ),

        createdAt:
          now.toISOString()

      };

      const db =
        this.getDB();

      if (!db) {

        App.toast(
          "Firebase database is unavailable.",
          "danger"
        );

        return;

      }

      try {

        await setDoc(

          doc(
            db,
            "fieldUpdates",
            fieldUpdate.id
          ),

          {

            ...fieldUpdate,

            firebaseCreatedAt:
              serverTimestamp()

          }

        );

        App.toast(
          "Field update submitted to the command dashboard.",
          "success"
        );

        this.render();

      } catch (error) {

        console.error(
          "Unable to save field update:",
          error
        );

        App.toast(
          "Unable to submit field update.",
          "danger"
        );

      }

    },

    quickFieldUpdate() {

      const field =
        document.getElementById(
          "field-message"
        );

      if (field) {

        field.focus();

        field.scrollIntoView({

          behavior: "smooth",

          block: "center"

        });

        App.toast(
          "Field update form ready.",
          "info"
        );

        return;

      }

      App.toast(
        "Field update form is unavailable.",
        "warning"
      );

    },

    /* =======================================================

       ACKNOWLEDGE ALERT

       ======================================================== */

    async acknowledge(id) {

      if (!id) {

        App.toast(
          "Alert ID is missing.",
          "warning"
        );

        return;

      }

      const alert =
        this.getAlerts().find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (!alert) {

        App.toast(
          "Alert not found.",
          "danger"
        );

        return;

      }

      const session =
        App.getSession() || {};

      if (
        !Array.isArray(
          alert.acknowledgedBy
        )
      ) {

        alert.acknowledgedBy =
          [];

      }

      const identifier =
        session.email ||
        session.name ||
        "Responder";

      if (
        !alert.acknowledgedBy.includes(
          identifier
        )
      ) {

        alert.acknowledgedBy.push(
          identifier
        );

      }

      alert.acknowledgedAt =
        new Date().toISOString();

      const db =
        this.getDB();

      if (!db) {

        App.toast(
          "Firebase database is unavailable.",
          "danger"
        );

        return;

      }

      try {

        await updateDoc(

          doc(
            db,
            "alerts",
            String(id)
          ),

          {

            acknowledgedBy:
              alert.acknowledgedBy,

            acknowledgedAt:
              alert.acknowledgedAt,

            updatedAt:
              serverTimestamp()

          }

        );

        App.toast(
          `Alert #${id} acknowledged.`,
          "success"
        );

      } catch (error) {

        console.error(
          "Unable to acknowledge alert:",
          error
        );

        App.toast(
          "Unable to acknowledge alert.",
          "danger"
        );

      }

    },

    /* =======================================================

       ASSIGN RESCUE REQUEST

       ======================================================== */

    assignRequest(id) {

      if (!id) {

        App.toast(
          "Rescue request ID is missing.",
          "warning"
        );

        return;

      }

      const session =
        App.getSession() || {};

      const responder =
        session.name ||
        session.email ||
        "Responder";

      if (
        typeof RescueData.updateRescueRequest !==
        "function"
      ) {

        App.toast(
          "Rescue request management is unavailable.",
          "danger"
        );

        return;

      }

      RescueData.updateRescueRequest(

        id,

        "Assigned",

        {

          assignedTo:
            responder

        }

      );

      App.toast(
        `Rescue request assigned to ${responder}.`,
        "success"
      );

      this.render();

    },

    /* =======================================================

       RESIDENT SAFETY CHECK-IN

       ======================================================== */

    async residentSafe() {

      const session =
        App.getSession() || {};

      const now =
        new Date();

      const checkIn = {

        id:
          "SAFE-" +
          Date.now(),

        user:
          session.name ||
          session.email ||
          "Resident",

        email:
          session.email ||
          "",

        status:
          "Safe",

        time:
          now.toLocaleString(
            "en-PH"
          ),

        createdAt:
          now.toISOString()

      };

      const db =
        this.getDB();

      if (!db) {

        App.toast(
          "Firebase database is unavailable.",
          "danger"
        );

        return;

      }

      try {

        await setDoc(

          doc(
            db,
            "safetyCheckins",
            checkIn.id
          ),

          {

            ...checkIn,

            firebaseCreatedAt:
              serverTimestamp()

          }

        );

        App.toast(
          "Safety check-in recorded.",
          "success"
        );

      } catch (error) {

        console.error(
          "Unable to save safety check-in:",
          error
        );

        App.toast(
          "Unable to record safety check-in.",
          "danger"
        );

      }

    },

    /* =======================================================

       RESIDENT ASSISTANCE

       ======================================================== */

    residentHelp() {

      if (
        typeof App.openResidentSOS ===
        "function"
      ) {

        App.openResidentSOS();

        return;

      }

      App.toast(
        "Emergency assistance form is unavailable.",
        "danger"
      );

    },

    submitResidentHelp() {

      if (
        typeof App.submitResidentSOS ===
        "function"
      ) {

        App.submitResidentSOS();

        return;

      }

      App.toast(
        "Emergency assistance submission is unavailable.",
        "danger"
      );

    }

  };

  /* =========================================================

     START ALERT CENTER

     =========================================================== */

  async function startAlertCenter() {

    if (
      window.RescueData &&
      typeof RescueData.initializeFromFirestore ===
      "function"
    ) {

      try {

        await RescueData.initializeFromFirestore();

      } catch (error) {

        console.error(
          "RESCUE-IOT: RescueData initialization failed.",
          error
        );

      }

    }

    await Alerts.init();

  }

  window.addEventListener(

    "RescueDataReady",

    function () {

      Alerts.render();

    }

  );

  window.addEventListener(

    "RescueDataError",

    function (event) {

      console.error(
        "RESCUE-IOT: Data initialization error.",
        event.detail
      );

      Alerts.render();

    }

  );

  startAlertCenter();

})();

