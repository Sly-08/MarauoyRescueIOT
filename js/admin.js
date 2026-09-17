(function () {
  "use strict";

  const session =
    typeof App.getSession === "function"
      ? App.getSession()
      : null;

  if (
    !session ||
    !session.loggedIn ||
    session.role !== "admin"
  ) {
    window.location.href = "dashboard.html";
    return;
  }

  if (
    !App.initPage(
      "admin",
      "Admin Control Panel",
      "Sensors, users, announcements, and system settings"
    )
  ) {
    return;
  }

  /* =========================================================
     ADMIN OBJECT
     ========================================================= */

  window.Admin = {

    tab: "sensors",

    /* =======================================================
       INITIALIZATION
       ======================================================= */

    init() {
      this.loadSavedData();
      this.render();
    },

    /* =======================================================
       HELPERS
       ======================================================= */

    escape(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    /*
     * Safely pass values through inline onclick handlers.
     */
    jsArg(value) {
      return encodeURIComponent(
        String(value ?? "")
      );
    },

    decodeArg(value) {
      try {
        return decodeURIComponent(value);
      } catch (error) {
        return value;
      }
    },

    safeNumber(value, fallback = 0) {
      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : fallback;
    },

    /* =======================================================
       LOAD SAVED DATA
       ======================================================= */

    loadSavedData() {

      /* -----------------------------------------------------
         Thresholds
         ----------------------------------------------------- */

      try {
        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_thresholds"
            ) || "null"
          );

        if (
          stored &&
          typeof stored === "object" &&
          RescueData.thresholds
        ) {
          RescueData.thresholds = {
            ...RescueData.thresholds,

            safe: {
              ...(RescueData.thresholds.safe || {}),
              ...(stored.safe || {})
            },

            warning: {
              ...(RescueData.thresholds.warning || {}),
              ...(stored.warning || {})
            },

            danger: {
              ...(RescueData.thresholds.danger || {}),
              ...(stored.danger || {})
            }
          };
        }
      } catch (error) {
        console.warn(
          "Unable to restore thresholds:",
          error
        );
      }

      /* -----------------------------------------------------
         Sensors
         ----------------------------------------------------- */

      try {
        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_sensors"
            ) || "null"
          );

        if (Array.isArray(stored)) {
          RescueData.sensors = stored;
        }
      } catch (error) {
        console.warn(
          "Unable to restore sensors:",
          error
        );
      }

      /* -----------------------------------------------------
         System Settings
         ----------------------------------------------------- */

      try {
        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_system_settings"
            ) || "{}"
          );

        if (
          stored &&
          typeof stored === "object"
        ) {
          if (
            RescueData.system &&
            Object.prototype.hasOwnProperty.call(
              stored,
              "siren"
            )
          ) {
            RescueData.system.siren =
              stored.siren;
          }

          if (
            RescueData.system &&
            Object.prototype.hasOwnProperty.call(
              stored,
              "lights"
            )
          ) {
            RescueData.system.lights =
              stored.lights;
          }

          if (
            RescueData.system &&
            Object.prototype.hasOwnProperty.call(
              stored,
              "smsGateway"
            )
          ) {
            RescueData.system.gsm =
              stored.smsGateway;
          }
        }
      } catch (error) {
        console.warn(
          "Unable to restore system settings:",
          error
        );
      }

      /* -----------------------------------------------------
         Announcements
         ----------------------------------------------------- */

      try {
        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_announcements"
            ) || "null"
          );

        if (
          Array.isArray(stored) &&
          Array.isArray(
            RescueData.communityUpdates
          )
        ) {
          /*
           * Keep newest announcements first,
           * matching the application's community update usage.
           */
          RescueData.communityUpdates =
            stored
              .slice()
              .reverse()
              .map(item => ({
                time: item.time || "",
                author: item.author || "",
                title: item.title || "",
                message: item.message || ""
              }));
        }
      } catch (error) {
        console.warn(
          "Unable to restore announcements:",
          error
        );
      }

      /* -----------------------------------------------------
         Emergency Override
         ----------------------------------------------------- */

      try {
        const override =
          JSON.parse(
            localStorage.getItem(
              "rescue_override"
            ) || "null"
          );

        if (
          override &&
          override.active &&
          Array.isArray(
            RescueData.alertChannels
          )
        ) {
          this.applyOverrideToChannels();
        }
      } catch (error) {
        console.warn(
          "Unable to restore emergency override:",
          error
        );
      }
    },

    /* =======================================================
       MAIN RENDER
       ======================================================= */

    render() {

      const root =
        document.getElementById(
          "admin-root"
        );

      if (!root) {
        console.error(
          "Admin root element not found."
        );
        return;
      }

      root.innerHTML = `
        <div class="admin-tabs">

          ${[
            ["sensors", "Sensor Management"],
            ["users", "User Management"],
            ["requests", "Rescue Requests"],
            ["announcements", "Announcements"],
            ["settings", "System Settings"]
          ]
            .map(([id, label]) => `
              <button
                type="button"
                class="${this.tab === id ? "active" : ""}"
                onclick="Admin.open('${id}')">
                ${this.escape(label)}
              </button>
            `)
            .join("")}

        </div>

        <section id="admin-content">
          ${this.content()}
        </section>
      `;
    },

    /* =======================================================
       TAB NAVIGATION
       ======================================================= */

    open(tab) {

      const allowedTabs = [
        "sensors",
        "users",
        "requests",
        "announcements",
        "settings"
      ];

      this.tab =
        allowedTabs.includes(tab)
          ? tab
          : "sensors";

      this.render();
    },

    /* =======================================================
       CONTENT ROUTER
       ======================================================= */

    content() {

      switch (this.tab) {

        case "users":
          return this.userView();

        case "requests":
          return this.requestView();

        case "announcements":
          return this.announcementView();

        case "settings":
          return this.settingsView();

        case "sensors":
        default:
          return this.sensorView();
      }
    },

    /* =======================================================
       SENSOR MANAGEMENT
       ======================================================= */

    sensorView() {

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      return `
        <div class="admin-section active">

          <article class="card card-pad">

            <div class="card-header">

              <div>
                <h3 class="card-title">
                  Sensor Management
                </h3>

                <p class="muted">
                  Manage and configure flood monitoring nodes.
                </p>
              </div>

              <button
                type="button"
                class="btn btn-primary"
                onclick="Admin.addSensor()">
                Add Sensor
              </button>

            </div>

            <div class="table-wrap">

              <table class="data-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Reading</th>
                    <th>Status</th>
                    <th>Battery</th>
                    <th>Signal</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  ${
                    sensors.length
                      ? sensors
                          .map(sensor =>
                            this.sensorRow(sensor)
                          )
                          .join("")
                      : `
                        <tr>
                          <td colspan="8">
                            <div class="empty-state">
                              No sensors found.
                            </div>
                          </td>
                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>

          </article>

        </div>
      `;
    },

    sensorRow(sensor) {

      const reading =
        this.safeNumber(
          sensor.lastReading,
          0
        );

      let status = {
        key: "safe",
        color: "inherit"
      };

      if (
        typeof RescueData.status ===
        "function"
      ) {
        status =
          RescueData.status(reading) || status;
      }

      const sensorId =
        this.jsArg(sensor.id);

      return `
        <tr>

          <td>
            <strong>
              ${this.escape(sensor.id)}
            </strong>
          </td>

          <td>
            ${this.escape(sensor.name)}

            <br>

            <span class="muted">
              ${this.escape(sensor.barangay)}
            </span>
          </td>

          <td>
            ${this.escape(sensor.device)}
          </td>

          <td>
            <strong
              style="color:${this.escape(
                status.color || "inherit"
              )}">
              ${this.escape(sensor.lastReading)} cm
            </strong>
          </td>

          <td>
            ${App.statusBadge(
              sensor.status === "online"
                ? "safe"
                : "warning",
              this.escape(
                sensor.status || "unknown"
              )
            )}
          </td>

          <td>
            ${this.escape(
              sensor.battery ?? 0
            )}%
          </td>

          <td>
            ${this.escape(
              sensor.signal || "Unknown"
            )}
          </td>

          <td>

            <div style="
              display:flex;
              gap:6px;
              flex-wrap:wrap;
            ">

              <button
                type="button"
                class="btn btn-secondary"
                onclick="Admin.editSensor(decodeURIComponent('${sensorId}'))">
                Edit
              </button>

              <button
                type="button"
                class="btn btn-ghost"
                onclick="Admin.toggleSensor(decodeURIComponent('${sensorId}'))">
                ${
                  sensor.status === "online"
                    ? "Maintenance"
                    : "Activate"
                }
              </button>

            </div>

          </td>

        </tr>
      `;
    },

    addSensor() {

      App.showModal(
        "Add Sensor",
        `
          <div class="stack-sm">

            <label class="form-group">
              <span class="form-label">
                Sensor ID
              </span>

              <input
                id="admin-sensor-id"
                class="form-input"
                placeholder="SEN-005">
            </label>

            <label class="form-group">
              <span class="form-label">
                Sensor Name
              </span>

              <input
                id="admin-sensor-name"
                class="form-input"
                placeholder="Marauoy Creek Point C">
            </label>

            <label class="form-group">
              <span class="form-label">
                Barangay
              </span>

              <input
                id="admin-sensor-barangay"
                class="form-input"
                value="Marauoy">
            </label>

            <label class="form-group">
              <span class="form-label">
                Device
              </span>

              <input
                id="admin-sensor-device"
                class="form-input"
                placeholder="Ultrasonic + ESP32">
            </label>

            <label class="form-group">
              <span class="form-label">
                Latitude
              </span>

              <input
                id="admin-sensor-lat"
                class="form-input"
                type="number"
                step="0.000001"
                value="13.9400">
            </label>

            <label class="form-group">
              <span class="form-label">
                Longitude
              </span>

              <input
                id="admin-sensor-lng"
                class="form-input"
                type="number"
                step="0.000001"
                value="121.1620">
            </label>

          </div>
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
            class="btn btn-primary"
            onclick="Admin.saveNewSensor()">
            Add Sensor
          </button>
        `
      );
    },

    saveNewSensor() {

      const id =
        document.getElementById(
          "admin-sensor-id"
        )?.value.trim();

      const name =
        document.getElementById(
          "admin-sensor-name"
        )?.value.trim();

      const barangay =
        document.getElementById(
          "admin-sensor-barangay"
        )?.value.trim();

      const device =
        document.getElementById(
          "admin-sensor-device"
        )?.value.trim();

      const lat =
        Number(
          document.getElementById(
            "admin-sensor-lat"
          )?.value
        );

      const lng =
        Number(
          document.getElementById(
            "admin-sensor-lng"
          )?.value
        );

      if (
        !id ||
        !name ||
        !barangay ||
        !device
      ) {
        App.toast(
          "Please complete all sensor fields.",
          "warning"
        );
        return;
      }

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      if (
        sensors.some(
          sensor =>
            String(sensor.id)
              .toLowerCase() ===
            id.toLowerCase()
        )
      ) {
        App.toast(
          "A sensor with this ID already exists.",
          "warning"
        );
        return;
      }

      const currentLevel =
        this.safeNumber(
          RescueData.currentWaterLevel,
          0
        );

      sensors.push({
        id,
        name,
        barangay,

        lat:
          Number.isFinite(lat)
            ? lat
            : 13.9400,

        lng:
          Number.isFinite(lng)
            ? lng
            : 121.1620,

        status: "online",

        battery: 100,

        lastReading:
          currentLevel,

        signal: "Strong",

        device
      });

      RescueData.sensors =
        sensors;

      this.saveSensors();

      App.closeModal();

      App.toast(
        `${id} added successfully.`,
        "success"
      );

      this.render();
    },

    editSensor(id) {

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const sensor =
        sensors.find(
          item =>
            String(item.id) ===
            String(id)
        );

      if (!sensor) {
        App.toast(
          "Sensor not found.",
          "danger"
        );
        return;
      }

      App.showModal(
        `Edit ${this.escape(sensor.id)}`,
        `
          <div class="stack-sm">

            <label class="form-group">
              <span class="form-label">
                Sensor Name
              </span>

              <input
                id="edit-sensor-name"
                class="form-input"
                value="${this.escape(sensor.name)}">
            </label>

            <label class="form-group">
              <span class="form-label">
                Barangay
              </span>

              <input
                id="edit-sensor-barangay"
                class="form-input"
                value="${this.escape(sensor.barangay)}">
            </label>

            <label class="form-group">
              <span class="form-label">
                Device
              </span>

              <input
                id="edit-sensor-device"
                class="form-input"
                value="${this.escape(sensor.device)}">
            </label>

            <label class="form-group">
              <span class="form-label">
                Battery %
              </span>

              <input
                id="edit-sensor-battery"
                class="form-input"
                type="number"
                min="0"
                max="100"
                value="${this.escape(sensor.battery ?? 100)}">
            </label>

            <label class="form-group">
              <span class="form-label">
                Signal
              </span>

              <select
                id="edit-sensor-signal"
                class="form-input">

                ${[
                  "Strong",
                  "Good",
                  "Weak",
                  "Offline"
                ]
                  .map(signal => `
                    <option
                      value="${this.escape(signal)}"
                      ${
                        sensor.signal === signal
                          ? "selected"
                          : ""
                      }>
                      ${this.escape(signal)}
                    </option>
                  `)
                  .join("")}

              </select>
            </label>

          </div>
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
            class="btn btn-primary"
            onclick="Admin.saveSensor(decodeURIComponent('${this.jsArg(sensor.id)}'))">
            Save Changes
          </button>
        `
      );
    },

    saveSensor(id) {

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const sensor =
        sensors.find(
          item =>
            String(item.id) ===
            String(id)
        );

      if (!sensor) {
        App.toast(
          "Sensor not found.",
          "danger"
        );
        return;
      }

      sensor.name =
        document.getElementById(
          "edit-sensor-name"
        )?.value.trim() ||
        sensor.name;

      sensor.barangay =
        document.getElementById(
          "edit-sensor-barangay"
        )?.value.trim() ||
        sensor.barangay;

      sensor.device =
        document.getElementById(
          "edit-sensor-device"
        )?.value.trim() ||
        sensor.device;

      const battery =
        Number(
          document.getElementById(
            "edit-sensor-battery"
          )?.value
        );

      if (Number.isFinite(battery)) {
        sensor.battery =
          Math.max(
            0,
            Math.min(
              100,
              battery
            )
          );
      }

      sensor.signal =
        document.getElementById(
          "edit-sensor-signal"
        )?.value ||
        sensor.signal;

      this.saveSensors();

      App.closeModal();

      App.toast(
        `${sensor.id} updated successfully.`,
        "success"
      );

      this.render();
    },

    toggleSensor(id) {

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const sensor =
        sensors.find(
          item =>
            String(item.id) ===
            String(id)
        );

      if (!sensor) {
        App.toast(
          "Sensor not found.",
          "danger"
        );
        return;
      }

      sensor.status =
        sensor.status === "online"
          ? "maintenance"
          : "online";

      /*
       * A sensor put into maintenance should still
       * retain its last reading and configuration.
       */
      this.saveSensors();

      App.toast(
        `${sensor.id} is now ${sensor.status}.`,
        sensor.status === "online"
          ? "success"
          : "warning"
      );

      this.render();
    },

    saveSensors() {

      try {
        localStorage.setItem(
          "rescue_sensors",
          JSON.stringify(
            Array.isArray(RescueData.sensors)
              ? RescueData.sensors
              : []
          )
        );
      } catch (error) {
        console.error(
          "Unable to save sensors:",
          error
        );

        App.toast(
          "Unable to save sensor changes.",
          "danger"
        );
      }
    },

    /* =======================================================
       USER MANAGEMENT
       ======================================================= */

    getUsers() {

      if (
        typeof App.getRegisteredUsers ===
        "function"
      ) {
        return App.getRegisteredUsers() || [];
      }

      return Array.isArray(RescueData.users)
        ? RescueData.users
        : [];
    },

    saveUsers(users) {

      if (
        typeof App.saveRegisteredUsers ===
        "function"
      ) {
        App.saveRegisteredUsers(users);
        return;
      }

      try {
        localStorage.setItem(
          "rescue_users",
          JSON.stringify(users)
        );
      } catch (error) {
        console.error(
          "Unable to save users:",
          error
        );
      }
    },

    userView() {

      const users =
        this.getUsers();

      return `
        <div class="admin-section active">

          <article class="card card-pad">

            <div class="card-header">

              <div>
                <h3 class="card-title">
                  User Management
                </h3>

                <p class="muted">
                  Manage registered residents,
                  responders, and administrators.
                </p>
              </div>

              <button
                type="button"
                class="btn btn-primary"
                onclick="Admin.addUser()">
                Add User
              </button>

            </div>

            <div class="table-wrap">

              <table class="data-table">

                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Barangay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  ${
                    users.length
                      ? users
                          .map(user =>
                            this.userRow(user)
                          )
                          .join("")
                      : `
                        <tr>
                          <td colspan="6">
                            <div class="empty-state">
                              No registered users.
                            </div>
                          </td>
                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>

          </article>

        </div>
      `;
    },

    userRow(user) {

      const status =
        String(
          user.status || "active"
        ).toLowerCase();

      const roleLabel = {
        admin: "Administrator",
        resident: "Resident",
        responder: "Emergency Responder"
      }[user.role] || user.role;

      return `
        <tr>

          <td>
            <strong>
              ${this.escape(user.name)}
            </strong>
          </td>

          <td>
            ${this.escape(user.email)}
          </td>

          <td>
            ${this.escape(roleLabel)}
          </td>

          <td>
            ${this.escape(
              user.barangay || "—"
            )}
          </td>

          <td>
            ${App.statusBadge(
              status === "active"
                ? "safe"
                : "danger",
              status
            )}
          </td>

          <td>

            <button
              type="button"
              class="btn btn-secondary"
              onclick="Admin.manageUser(decodeURIComponent('${this.jsArg(user.email)}'))">
              Manage
            </button>

          </td>

        </tr>
      `;
    },

    addUser() {

      App.showModal(
        "Add User",
        `
          <div class="stack-sm">

            <label class="form-group">
              <span class="form-label">
                Full Name
              </span>

              <input
                id="admin-user-name"
                class="form-input"
                placeholder="Juan Dela Cruz">
            </label>

            <label class="form-group">
              <span class="form-label">
                Email
              </span>

              <input
                id="admin-user-email"
                class="form-input"
                type="email"
                placeholder="user@example.com">
            </label>

            <label class="form-group">
              <span class="form-label">
                Barangay
              </span>

              <input
                id="admin-user-barangay"
                class="form-input"
                value="Marauoy">
            </label>

            <label class="form-group">
              <span class="form-label">
                Role
              </span>

              <select
                id="admin-user-role"
                class="form-input">

                <option value="resident">
                  Resident
                </option>

                <option value="responder">
                  Emergency Responder
                </option>

                <option value="admin">
                  Administrator
                </option>

              </select>
            </label>

            <label class="form-group">
              <span class="form-label">
                Password
              </span>

              <input
                id="admin-user-password"
                class="form-input"
                type="password"
                minlength="8"
                placeholder="Minimum 8 characters">
            </label>

          </div>
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
            class="btn btn-primary"
            onclick="Admin.saveNewUser()">
            Create User
          </button>
        `
      );
    },

    saveNewUser() {

      const name =
        document.getElementById(
          "admin-user-name"
        )?.value.trim();

      const email =
        document.getElementById(
          "admin-user-email"
        )?.value.trim().toLowerCase();

      const barangay =
        document.getElementById(
          "admin-user-barangay"
        )?.value.trim();

      const role =
        document.getElementById(
          "admin-user-role"
        )?.value;

      const password =
        document.getElementById(
          "admin-user-password"
        )?.value || "";

      if (
        !name ||
        !email ||
        !barangay ||
        !role ||
        !password
      ) {
        App.toast(
          "Please complete all required fields.",
          "warning"
        );
        return;
      }

      if (password.length < 8) {
        App.toast(
          "Password must contain at least 8 characters.",
          "warning"
        );
        return;
      }

      const users =
        this.getUsers();

      if (
        users.some(
          user =>
            String(user.email)
              .toLowerCase() ===
            email
        )
      ) {
        App.toast(
          "A user with this email already exists.",
          "warning"
        );
        return;
      }

      users.push({
        id:
          "USR-" +
          Date.now(),

        name,
        email,
        barangay,
        password,
        role,

        status: "active",

        createdAt:
          new Date().toISOString()
      });

      this.saveUsers(users);

      App.closeModal();

      App.toast(
        `${name} was added successfully.`,
        "success"
      );

      this.render();
    },

    manageUser(email) {

      const users =
        this.getUsers();

      const user =
        users.find(
          item =>
            String(item.email)
              .toLowerCase() ===
            String(email)
              .toLowerCase()
        );

      if (!user) {
        App.toast(
          "User not found.",
          "danger"
        );
        return;
      }

      const currentSession =
        App.getSession();

      const isCurrentUser =
        String(user.email).toLowerCase() ===
        String(
          currentSession?.email || ""
        ).toLowerCase();

      App.showModal(
        `Manage ${this.escape(user.name)}`,
        `
          <div class="stack-sm">

            <p>
              <strong>Email:</strong>
              ${this.escape(user.email)}
            </p>

            <label class="form-group">
              <span class="form-label">
                Role
              </span>

              <select
                id="manage-user-role"
                class="form-input"
                ${isCurrentUser ? "disabled" : ""}>

                <option
                  value="resident"
                  ${user.role === "resident" ? "selected" : ""}>
                  Resident
                </option>

                <option
                  value="responder"
                  ${user.role === "responder" ? "selected" : ""}>
                  Emergency Responder
                </option>

                <option
                  value="admin"
                  ${user.role === "admin" ? "selected" : ""}>
                  Administrator
                </option>

              </select>
            </label>

            <label class="form-group">
              <span class="form-label">
                Barangay
              </span>

              <input
                id="manage-user-barangay"
                class="form-input"
                value="${this.escape(
                  user.barangay || ""
                )}">
            </label>

            <label class="form-group">
              <span class="form-label">
                Account Status
              </span>

              <select
                id="manage-user-status"
                class="form-input"
                ${isCurrentUser ? "disabled" : ""}>

                <option
                  value="active"
                  ${
                    String(
                      user.status || "active"
                    ).toLowerCase() === "active"
                      ? "selected"
                      : ""
                  }>
                  Active
                </option>

                <option
                  value="inactive"
                  ${
                    String(
                      user.status || "active"
                    ).toLowerCase() !== "active"
                      ? "selected"
                      : ""
                  }>
                  Inactive
                </option>

              </select>
            </label>

            ${
              isCurrentUser
                ? `
                  <p class="muted">
                    Your current administrator account cannot
                    be deactivated or have its administrator role
                    changed from this panel.
                  </p>
                `
                : ""
            }

          </div>
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
            class="btn btn-primary"
            onclick="Admin.saveUser(decodeURIComponent('${this.jsArg(user.email)}'))">
            Save Changes
          </button>
        `
      );
    },

    saveUser(email) {

      const users =
        this.getUsers();

      const user =
        users.find(
          item =>
            String(item.email)
              .toLowerCase() ===
            String(email)
              .toLowerCase()
        );

      if (!user) {
        App.toast(
          "User not found.",
          "danger"
        );
        return;
      }

      const currentSession =
        App.getSession();

      const isCurrentUser =
        String(user.email).toLowerCase() ===
        String(
          currentSession?.email || ""
        ).toLowerCase();

      const roleInput =
        document.getElementById(
          "manage-user-role"
        );

      const statusInput =
        document.getElementById(
          "manage-user-status"
        );

      const newRole =
        roleInput?.value ||
        user.role;

      const newStatus =
        statusInput?.value ||
        "active";

      if (isCurrentUser) {

        if (
          newRole !== "admin" ||
          newStatus !== "active"
        ) {
          App.toast(
            "You cannot remove administrator access or deactivate your current account.",
            "warning"
          );
          return;
        }
      }

      user.role =
        newRole;

      user.barangay =
        document.getElementById(
          "manage-user-barangay"
        )?.value.trim() ||
        user.barangay;

      user.status =
        newStatus;

      this.saveUsers(users);

      App.closeModal();

      App.toast(
        "User account updated successfully.",
        "success"
      );

      this.render();
    },

    /* =======================================================
       RESCUE REQUEST MANAGEMENT
       ======================================================= */

    getRequests() {

      if (
        typeof RescueData.getRescueRequests ===
        "function"
      ) {
        return (
          RescueData.getRescueRequests() || []
        );
      }

      return [];
    },

    requestView() {

      const requests =
        this.getRequests();

      const openRequests =
        requests.filter(
          request =>
            request.status !== "Resolved"
        );

      return `
        <div class="admin-section active">

          <article class="card card-pad">

            <div class="card-header">

              <div>

                <h3 class="card-title">
                  Rescue Requests
                </h3>

                <p class="muted">
                  Monitor and manage resident emergency assistance requests.
                </p>

              </div>

              <div>
                <strong>
                  ${openRequests.length}
                </strong>

                <span class="muted">
                  open requests
                </span>
              </div>

            </div>

            <div class="table-wrap">

              <table class="data-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Reporter</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Responder</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  ${
                    requests.length
                      ? requests
                          .map(request =>
                            this.requestRow(request)
                          )
                          .join("")
                      : `
                        <tr>
                          <td colspan="8">
                            <div class="empty-state">
                              No rescue requests found.
                            </div>
                          </td>
                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>

          </article>

        </div>
      `;
    },

    requestRow(request) {

      const priorityKey =
        String(
          request.priority || ""
        ).toLowerCase();

      const priorityBadge =
        priorityKey === "critical"
          ? "danger"
          : priorityKey === "high"
          ? "warning"
          : "info";

      const statusKey =
        request.status === "Resolved"
          ? "safe"
          : request.status === "Pending"
          ? "warning"
          : "info";

      return `
        <tr>

          <td>
            <strong>
              ${this.escape(request.id)}
            </strong>

            <br>

            <span class="muted">
              ${this.escape(request.time)}
            </span>
          </td>

          <td>
            ${this.escape(request.reporter)}

            <br>

            <span class="muted">
              ${this.escape(request.contact)}
            </span>
          </td>

          <td>
            ${this.escape(request.type)}
          </td>

          <td>
            ${this.escape(request.location)}
          </td>

          <td>
            ${App.statusBadge(
              priorityBadge,
              this.escape(
                request.priority || "Normal"
              )
            )}
          </td>

          <td>
            ${App.statusBadge(
              statusKey,
              this.escape(
                request.status || "Pending"
              )
            )}
          </td>

          <td>
            ${
              request.assignedTo
                ? this.escape(
                    request.assignedTo
                  )
                : `<span class="muted">Unassigned</span>`
            }
          </td>

          <td>

            <button
              type="button"
              class="btn btn-secondary"
              onclick="Admin.manageRequest(decodeURIComponent('${this.jsArg(request.id)}'))">
              Manage
            </button>

          </td>

        </tr>
      `;
    },

    manageRequest(id) {

      const requests =
        this.getRequests();

      const request =
        requests.find(
          item =>
            String(item.id) ===
            String(id)
        );

      if (!request) {
        App.toast(
          "Rescue request not found.",
          "danger"
        );
        return;
      }

      const responders =
        this.getUsers()
          .filter(
            user =>
              user.role === "responder" &&
              String(
                user.status || "active"
              ).toLowerCase() ===
              "active"
          );

      App.showModal(
        `Manage ${this.escape(request.id)}`,
        `
          <div class="stack-sm">

            <div class="card card-pad">

              <strong>
                ${this.escape(request.type)}
              </strong>

              <p>
                <strong>Reporter:</strong>
                ${this.escape(request.reporter)}
              </p>

              <p>
                <strong>Location:</strong>
                ${this.escape(request.location)}
              </p>

              <p>
                <strong>Priority:</strong>
                ${this.escape(request.priority)}
              </p>

              <p>
                <strong>Details:</strong>
                ${this.escape(
                  request.note || "No details provided."
                )}
              </p>

            </div>

            <label class="form-group">
              <span class="form-label">
                Request Status
              </span>

              <select
                id="manage-request-status"
                class="form-input">

                ${[
                  "Pending",
                  "Assigned",
                  "In Progress",
                  "Resolved"
                ]
                  .map(status => `
                    <option
                      value="${this.escape(status)}"
                      ${
                        request.status === status
                          ? "selected"
                          : ""
                      }>
                      ${this.escape(status)}
                    </option>
                  `)
                  .join("")}

              </select>
            </label>

            <label class="form-group">
              <span class="form-label">
                Assign Responder
              </span>

              <select
                id="manage-request-responder"
                class="form-input">

                <option value="">
                  Unassigned
                </option>

                ${responders
                  .map(responder => `
                    <option
                      value="${this.escape(responder.name)}"
                      ${
                        request.assignedTo ===
                        responder.name
                          ? "selected"
                          : ""
                      }>
                      ${this.escape(
                        responder.name
                      )}
                    </option>
                  `)
                  .join("")}

              </select>
            </label>

          </div>
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
            class="btn btn-primary"
            onclick="Admin.saveRequest(decodeURIComponent('${this.jsArg(request.id)}'))">
            Save Request
          </button>
        `
      );
    },

    saveRequest(id) {

      const status =
        document.getElementById(
          "manage-request-status"
        )?.value ||
        "Pending";

      const assignedTo =
        document.getElementById(
          "manage-request-responder"
        )?.value ||
        null;

      const finalStatus =
        assignedTo &&
        status === "Pending"
          ? "Assigned"
          : status;

      if (
        typeof RescueData.updateRescueRequest !==
        "function"
      ) {
        App.toast(
          "Rescue request update function is unavailable.",
          "danger"
        );
        return;
      }

      RescueData.updateRescueRequest(
        id,
        finalStatus,
        {
          assignedTo
        }
      );

      App.closeModal();

      App.toast(
        `${id} updated successfully.`,
        "success"
      );

      this.render();
    },

    /* =======================================================
       ALERT CONFIGURATION
       ======================================================= */

    alertView() {

      const thresholds =
        RescueData.thresholds || {};

      const safe =
        thresholds.safe?.max ?? 50;

      const warning =
        thresholds.warning?.max ?? 80;

      const critical =
        thresholds.danger?.max ?? 500;

      return `
        <div class="admin-section active">

          <article class="card card-pad">

            <div class="card-header">

              <div>

                <h3 class="card-title">
                  Alert Configuration
                </h3>

                <p class="muted">
                  Adjust flood warning thresholds.
                </p>

              </div>

            </div>

            <div class="stack-sm setting-grid">

              ${this.thresholdSetting(
                "Safe Threshold",
                safe,
                "safe"
              )}

              ${this.thresholdSetting(
                "Warning Threshold",
                warning,
                "warning"
              )}

              ${this.thresholdSetting(
                "Critical Threshold",
                critical,
                "danger"
              )}

            </div>

          </article>

          <article class="card card-pad override-card">

            <div class="card-header">

              <div>

                <h3>
                  Emergency Override
                </h3>

                <p class="muted">
                  Activate all alert channels immediately.
                </p>

              </div>

              <button
                type="button"
                class="btn btn-danger"
                onclick="Admin.override()">
                Activate Override
              </button>

            </div>

          </article>

        </div>
      `;
    },

    thresholdSetting(
      name,
      value,
      key
    ) {

      return `
        <div class="setting-row">

          <div>

            <strong>
              ${this.escape(name)}
            </strong>

            <br>

            <span class="muted">
              Current maximum:
              ${this.escape(value)} cm
            </span>

          </div>

          <input
            id="threshold-${this.escape(key)}"
            class="form-input"
            type="number"
            min="1"
            max="500"
            value="${this.escape(value)}"
            style="max-width:150px">

          <button
            type="button"
            class="btn btn-secondary"
            onclick="Admin.saveThreshold('${this.escape(key)}')">
            Save
          </button>

        </div>
      `;
    },

    saveThreshold(key) {

      const input =
        document.getElementById(
          `threshold-${key}`
        );

      if (!input) {
        return;
      }

      const value =
        Number(input.value);

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 500
      ) {
        App.toast(
          "Enter a valid threshold between 1 and 500 cm.",
          "warning"
        );
        return;
      }

      const thresholds =
        RescueData.thresholds;

      if (!thresholds) {
        App.toast(
          "Threshold configuration is unavailable.",
          "danger"
        );
        return;
      }

      if (!thresholds.safe) {
        thresholds.safe = {
          max: 50
        };
      }

      if (!thresholds.warning) {
        thresholds.warning = {
          max: 80
        };
      }

      if (!thresholds.danger) {
        thresholds.danger = {
          max: 500
        };
      }

      if (key === "safe") {

        if (
          value >=
          Number(thresholds.warning.max)
        ) {
          App.toast(
            "Safe threshold must be lower than the warning threshold.",
            "warning"
          );
          return;
        }

        thresholds.safe.max =
          value;
      }

      else if (key === "warning") {

        if (
          value <=
          Number(thresholds.safe.max)
        ) {
          App.toast(
            "Warning threshold must be higher than the safe threshold.",
            "warning"
          );
          return;
        }

        if (
          value >=
          Number(thresholds.danger.max)
        ) {
          App.toast(
            "Warning threshold must be lower than the critical threshold.",
            "warning"
          );
          return;
        }

        thresholds.warning.max =
          value;
      }

      else if (key === "danger") {

        if (
          value <=
          Number(thresholds.warning.max)
        ) {
          App.toast(
            "Critical threshold must be higher than the warning threshold.",
            "warning"
          );
          return;
        }

        thresholds.danger.max =
          value;
      }

      else {
        return;
      }

      this.saveThresholds();

      App.toast(
        `${key} threshold updated.`,
        "success"
      );

      this.render();
    },

    saveThresholds() {

      try {
        localStorage.setItem(
          "rescue_thresholds",
          JSON.stringify(
            RescueData.thresholds
          )
        );
      } catch (error) {
        console.error(
          "Unable to save thresholds:",
          error
        );

        App.toast(
          "Unable to save threshold changes.",
          "danger"
        );
      }
    },

    /* =======================================================
       EMERGENCY OVERRIDE
       ======================================================= */

    applyOverrideToChannels() {

      if (
        !Array.isArray(
          RescueData.alertChannels
        )
      ) {
        return;
      }

      RescueData.alertChannels.forEach(
        channel => {

          if (
            channel.name ===
            "SMS Gateway"
          ) {
            channel.status =
              "Connected";
          }

          else if (
            channel.name ===
            "Local Siren"
          ) {
            channel.status =
              "Armed";
          }

          else if (
            channel.name ===
            "Warning Lights"
          ) {
            channel.status =
              "Ready";
          }

          else {
            channel.status =
              "Active";
          }
        }
      );
    },

    override() {

      App.showModal(
        "Emergency Override",
        `
          <div class="sos-warning">

            <strong>
              Emergency Override
            </strong>

            <p>
              This action will activate the simulated
              emergency alert channels.
            </p>

            <ul>
              <li>Mobile App</li>
              <li>SMS Gateway</li>
              <li>Local Siren</li>
              <li>Warning Lights</li>
              <li>Dashboard</li>
            </ul>

          </div>
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
            onclick="Admin.activateOverride()">
            Activate Override
          </button>
        `
      );
    },

    activateOverride() {

      this.applyOverrideToChannels();

      try {

        const currentSession =
          App.getSession();

        localStorage.setItem(
          "rescue_override",
          JSON.stringify({
            active: true,

            activatedAt:
              new Date().toISOString(),

            activatedBy:
              currentSession?.email || "admin"
          })
        );

      } catch (error) {

        console.error(
          "Unable to save emergency override:",
          error
        );
      }

      App.closeModal();

      App.toast(
        "Emergency override activated.",
        "warning"
      );

      this.render();
    },

    /* =======================================================
       ANNOUNCEMENTS
       ======================================================= */

    getAnnouncements() {

      try {

        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_announcements"
            ) || "null"
          );

        if (Array.isArray(stored)) {
          return stored;
        }

      } catch (error) {

        console.error(
          "Unable to read announcements:",
          error
        );
      }

      return [];
    },

    saveAnnouncements(items) {

      try {

        localStorage.setItem(
          "rescue_announcements",
          JSON.stringify(items)
        );

      } catch (error) {

        console.error(
          "Unable to save announcements:",
          error
        );

        App.toast(
          "Unable to save announcement.",
          "danger"
        );
      }
    },

    announcementView() {

      const announcements =
        this.getAnnouncements();

      return `
        <div class="admin-section active">

          <section class="layout-2">

            <article class="card card-pad">

              <div class="card-header">

                <div>

                  <h3 class="card-title">
                    Create Announcement
                  </h3>

                  <p class="muted">
                    Broadcast a manual advisory.
                  </p>

                </div>

              </div>

              <form
                class="stack-sm"
                onsubmit="event.preventDefault();Admin.publishAnnouncement()">

                <label class="form-group">

                  <span class="form-label">
                    Title
                  </span>

                  <input
                    id="announcement-title"
                    class="form-input"
                    placeholder="Flood Preparedness Advisory"
                    required>

                </label>

                <label class="form-group">

                  <span class="form-label">
                    Message
                  </span>

                  <textarea
                    id="announcement-message"
                    class="form-input"
                    rows="5"
                    placeholder="Enter the official community advisory..."
                    required></textarea>

                </label>

                <button
                  class="btn btn-primary"
                  type="submit">
                  Verify and Publish
                </button>

              </form>

            </article>

            <article class="card card-pad">

              <div class="card-header">

                <div>

                  <h3 class="card-title">
                    Announcement History
                  </h3>

                  <p class="muted">
                    Recent broadcasts.
                  </p>

                </div>

              </div>

              <div class="timeline">

                ${this.renderAnnouncements(
                  announcements
                )}

              </div>

            </article>

          </section>

        </div>
      `;
    },

    renderAnnouncements(items) {

      if (!items.length) {

        return `
          <div class="empty-state">
            No announcements have been published yet.
          </div>
        `;
      }

      return items
        .slice()
        .reverse()
        .map(item => `
          <div class="timeline-item info">

            <div class="timeline-time">
              ${this.escape(item.time)}
            </div>

            <div class="timeline-title">
              ${this.escape(item.title)}
            </div>

            <div class="timeline-desc">
              ${this.escape(item.message)}
            </div>

            <small class="muted">
              Published by
              ${this.escape(item.author)}
            </small>

          </div>
        `)
        .join("");
    },

    publishAnnouncement() {

      const title =
        document.getElementById(
          "announcement-title"
        )?.value.trim();

      const message =
        document.getElementById(
          "announcement-message"
        )?.value.trim();

      if (!title || !message) {
        App.toast(
          "Please enter both a title and message.",
          "warning"
        );
        return;
      }

      const currentSession =
        App.getSession();

      const announcements =
        this.getAnnouncements();

      const now =
        new Date();

      const item = {

        id:
          "ANN-" +
          Date.now(),

        title,

        message,

        author:
          currentSession?.name ||
          "Administrator",

        email:
          currentSession?.email ||
          "",

        time:
          now.toLocaleString(
            "en-PH"
          ),

        createdAt:
          now.toISOString()
      };

      announcements.push(item);

      this.saveAnnouncements(
        announcements
      );

      /*
       * Keep current application state synchronized.
       * communityUpdates expects newest items first.
       */
      if (
        Array.isArray(
          RescueData.communityUpdates
        )
      ) {

        RescueData.communityUpdates.unshift({
          time: item.time,
          author: item.author,
          title: item.title,
          message: item.message
        });
      }

      App.toast(
        "Announcement published successfully.",
        "success"
      );

      this.render();
    },

    /* =======================================================
       SYSTEM SETTINGS
       ======================================================= */

    getSettings() {

      try {

        const stored =
          JSON.parse(
            localStorage.getItem(
              "rescue_system_settings"
            ) || "{}"
          );

        return (
          stored &&
          typeof stored === "object"
        )
          ? stored
          : {};

      } catch (error) {

        console.error(
          "Unable to read system settings:",
          error
        );

        return {};
      }
    },

    saveSettings(settings) {

      try {

        localStorage.setItem(
          "rescue_system_settings",
          JSON.stringify(settings)
        );

      } catch (error) {

        console.error(
          "Unable to save system settings:",
          error
        );

        App.toast(
          "Unable to save system settings.",
          "danger"
        );
      }
    },

    settingsView() {

      const settings =
        this.getSettings();

      const refresh =
        settings.refreshInterval ??
        2;

      const sms =
        settings.smsGateway ??
        RescueData.system?.gsm ??
        "Sandbox Gateway";

      const siren =
        settings.siren ??
        RescueData.system?.siren ??
        "Armed";

      const lights =
        settings.lights ??
        RescueData.system?.lights ??
        "Ready";

      const backup =
        settings.backup ??
        "Daily local export";

      return `
        <div class="admin-section active">

          <article class="card card-pad">

            <div class="card-header">

              <div>

                <h3 class="card-title">
                  System Settings
                </h3>

                <p class="muted">
                  Core platform configuration.
                </p>

              </div>

            </div>

            <div class="stack-sm setting-grid">

              ${this.setting(
                "Data Refresh Interval",
                `${refresh} seconds`,
                "Save",
                "refresh"
              )}

              ${this.setting(
                "SMS API Configuration",
                sms,
                "Configure",
                "sms"
              )}

              ${this.setting(
                "Offline Siren Mode",
                siren,
                "Save",
                "siren"
              )}

              ${this.setting(
                "Warning Lights",
                lights,
                "Save",
                "lights"
              )}

              ${this.setting(
                "Backup Settings",
                backup,
                "Update",
                "backup"
              )}

              ${this.setting(
                "System Logs",
                "0 critical issues",
                "View Logs",
                "logs"
              )}

            </div>

          </article>

          <article class="card card-pad">

            <div class="card-header">

              <div>
                <h3>
                  Demo Environment
                </h3>

                <p class="muted">
                  Restore the original demo data and
                  remove locally saved administrative changes.
                </p>
              </div>

              <button
                type="button"
                class="btn btn-danger"
                onclick="Admin.resetDemoData()">
                Reset Demo Data
              </button>

            </div>

          </article>

        </div>
      `;
    },

    setting(
      name,
      value,
      action,
      key
    ) {

      return `
        <div class="setting-row">

          <div>

            <strong>
              ${this.escape(name)}
            </strong>

            <br>

            <span class="muted">
              ${this.escape(value)}
            </span>

          </div>

          <input
            id="setting-${this.escape(key)}"
            class="form-input"
            value="${this.escape(value)}">

          <button
            type="button"
            class="btn btn-secondary"
            onclick="Admin.saveSetting('${this.escape(key)}')">
            ${this.escape(action)}
          </button>

        </div>
      `;
    },

    saveSetting(key) {

      const input =
        document.getElementById(
          `setting-${key}`
        );

      if (!input) {
        return;
      }

      const value =
        input.value.trim();

      const settings =
        this.getSettings();

      if (key === "refresh") {

        const seconds =
          Number(
            value.replace(
              /[^0-9.]/g,
              ""
            )
          );

        if (
          !Number.isFinite(seconds) ||
          seconds <= 0
        ) {
          App.toast(
            "Enter a valid refresh interval.",
            "warning"
          );
          return;
        }

        settings.refreshInterval =
          seconds;
      }

      else if (key === "backup") {

        settings.backup =
          value ||
          "Daily local export";
      }

      else if (key === "sms") {

        settings.smsGateway =
          value ||
          "Sandbox Gateway";

        if (RescueData.system) {
          RescueData.system.gsm =
            settings.smsGateway;
        }
      }

      else if (key === "siren") {

        const finalValue =
          value ||
          "Armed";

        settings.siren =
          finalValue;

        if (RescueData.system) {
          RescueData.system.siren =
            finalValue;
        }
      }

      else if (key === "lights") {

        const finalValue =
          value ||
          "Ready";

        settings.lights =
          finalValue;

        if (RescueData.system) {
          RescueData.system.lights =
            finalValue;
        }
      }

      else if (key === "logs") {

        App.toast(
          "System logs are currently clear.",
          "info"
        );

        return;
      }

      else {
        return;
      }

      this.saveSettings(
        settings
      );

      App.toast(
        "System setting saved.",
        "success"
      );

      this.render();
    },

    /* =======================================================
       RESET DEMO DATA
       ======================================================= */

    resetDemoData() {

      App.showModal(
        "Reset Demo Data",
        `
          <p>
            This will clear locally stored user,
            rescue request, announcement, threshold,
            sensor, override, and system setting changes.
          </p>

          <p class="muted">
            Use this only if you want to restore the
            original demo environment.
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
            onclick="Admin.confirmResetDemoData()">
            Reset Demo Data
          </button>
        `
      );
    },

    confirmResetDemoData() {

      [
        "rescue_users",
        "rescue_requests",
        "rescue_announcements",
        "rescue_thresholds",
        "rescue_system_settings",
        "rescue_sensors",
        "rescue_override"
      ].forEach(
        key =>
          localStorage.removeItem(key)
      );

      if (
        typeof App.initializeDemoUsers ===
        "function"
      ) {
        App.initializeDemoUsers();
      }

      App.closeModal();

      App.toast(
        "Demo data reset. Reloading...",
        "warning"
      );

      setTimeout(
        () =>
          window.location.reload(),
        800
      );
    }

  };

  /* =========================================================
     START ADMIN
     ========================================================= */

  Admin.init();

})();