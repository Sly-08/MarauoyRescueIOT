if (
  App.initPage(
    "monitoring",
    "Live Monitoring",
    "Live water-level readings and sensor status"
  )
) {
  window.Monitoring = {

    range: 6,
    chart: null,
    timer: null,

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    render() {

      const root =
        document.getElementById("monitoring-root");

      if (!root) {
        console.error(
          "Monitoring root element not found."
        );
        return;
      }

      const session =
        App.getSession() || {};

      /*
       * Responder gets the mobile monitoring interface.
       */
      if (session.role === "responder") {
        this.renderResponder();
        return;
      }

      /*
       * Safely obtain history data.
       */
      let data = [];

      try {
        if (
          typeof RescueData.history === "function"
        ) {
          data =
            RescueData.history(this.range);
        }
      } catch (error) {
        console.error(
          "Unable to load monitoring history:",
          error
        );
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      /*
       * If Firebase history is temporarily unavailable,
       * use the current water level for the chart.
       */
      if (!data.length) {

        data = [{
          time: new Date().toISOString(),
          level:
            Number(
              RescueData.currentWaterLevel || 0
            )
        }];
      }

      /*
       * Destroy the previous Chart.js instance before
       * replacing the canvas.
       */
      if (
        this.chart &&
        typeof this.chart.destroy === "function"
      ) {
        try {
          this.chart.destroy();
        } catch (error) {
          console.warn(
            "Unable to destroy previous monitoring chart:",
            error
          );
        }
      }

      this.chart = null;

      root.innerHTML = `

        <section class="layout-2">

          <!-- =========================================
               LEFT COLUMN
               ========================================= -->

          <div class="stack">

            <article class="card card-pad">

              <div class="card-header">

                <div>
                  <h3>
                    Real-Time Water Level Graph
                  </h3>

                  <p class="muted">
                    Live water-level readings from Firebase.
                  </p>
                </div>

                <div class="range-tabs">

                  ${[
                    1,
                    6,
                    24,
                    168
                  ]
                    .map(hours => `

                      <button
                        type="button"
                        class="${
                          hours === this.range
                            ? "active"
                            : ""
                        }"
                        onclick="Monitoring.setRange(${hours})">

                        ${
                          hours === 168
                            ? "7D"
                            : `${hours}H`
                        }

                      </button>

                    `)
                    .join("")}

                </div>

              </div>

              <div class="chart-box">

                <canvas
                  id="monitor-chart">
                </canvas>

              </div>

            </article>

          </div>


          <!-- =========================================
               RIGHT COLUMN
               ========================================= -->

          <aside class="stack">

            ${this.liveMonitoringPanel()}

          </aside>

        </section>
      `;


      /* =============================================
         CHART
         ============================================= */

      const canvas =
        document.getElementById(
          "monitor-chart"
        );

      if (
        canvas &&
        typeof RescueCharts !== "undefined" &&
        typeof RescueCharts.lineChart === "function"
      ) {

        try {

          this.chart =
            RescueCharts.lineChart(
              canvas,
              data
            );

        } catch (error) {

          console.error(
            "Unable to initialize monitoring chart:",
            error
          );

        }

      } else {

        console.error(
          "Monitoring chart could not be initialized."
        );

      }

    },


    /* =====================================================
       UPDATE CHART
       ===================================================== */

    updateChart() {

      if (!this.chart) {
        return;
      }

      let data = [];

      try {

        data =
          typeof RescueData.history === "function"
            ? RescueData.history(this.range)
            : [];

      } catch (error) {

        console.error(
          "Unable to update monitoring history:",
          error
        );

        return;
      }

      if (!Array.isArray(data)) {
        return;
      }

      /*
       * Keep one fallback point when there is no history.
       */
      if (!data.length) {

        data = [{
          time: new Date().toISOString(),
          level:
            Number(
              RescueData.currentWaterLevel || 0
            )
        }];

      }

      const labels =
        data.map(point => {

          try {

            return typeof RescueData.formatTime === "function"
              ? RescueData.formatTime(point.time)
              : new Date(point.time).toLocaleTimeString(
                  "en-PH",
                  {
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                );

          } catch (error) {

            return String(point.time ?? "");

          }

        });

      const values =
        data.map(point =>
          Number(
            point.level ??
            point.value ??
            0
          )
        );

      if (
        this.chart.data &&
        this.chart.data.labels &&
        this.chart.data.datasets?.[0]
      ) {

        this.chart.data.labels =
          labels;

        this.chart.data.datasets[0].data =
          values;

        if (
          typeof this.chart.update === "function"
        ) {

          this.chart.update("none");

        }

      }

    },


    /* =====================================================
       RESPONDER VIEW
       ===================================================== */

    renderResponder() {

      const root =
        document.getElementById(
          "monitoring-root"
        );

      if (!root) return;

      const status =
        typeof RescueData.status ===
        "function"
          ? RescueData.status()
          : {
              key: "safe",
              label: "Safe",
              action: "Monitor current conditions."
            };

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const online =
        typeof RescueData.onlineSensors ===
        "function"
          ? RescueData.onlineSensors()
          : sensors.filter(
              sensor =>
                sensor.status === "online"
            ).length;

      const system =
        RescueData.system || {};

      root.innerHTML = `

        <section class="mobile-app-shell">

          <div class="mobile-app responder-app responder-sensors-app">

            ${App.responderTopBar(status)}


            <section class="mobile-card featured">

              <div class="mobile-card-head">

                <span class="eyebrow">
                  Sensor Readings
                </span>

                ${App.statusBadge(
                  "safe",
                  `${online}/${sensors.length} Online`
                )}

              </div>

              <h2>
                Field sensor status
              </h2>

              <p>
                Use these readings to confirm field
                conditions before dispatch or route updates.
              </p>

            </section>


            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">
                  Monitoring Nodes
                </span>

                <a href="map.html">
                  Map
                </a>

              </div>

              <div
                class="mobile-route-list"
                id="responder-sensor-list">

                ${
                  sensors.length
                    ? sensors
                        .map(sensor =>
                          this.mobileSensor(sensor)
                        )
                        .join("")
                    : `
                      <div class="empty-state">
                        No monitoring sensors available.
                      </div>
                    `
                }

              </div>

            </section>


            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">
                  Power and Signal
                </span>

                ${App.statusBadge(
                  "warning",
                  system.internet ||
                  "Unknown"
                )}

              </div>

              <div class="mobile-mini-grid">

                <span>
                  <strong>
                    ${this.escape(
                      system.solar ?? 0
                    )}%
                  </strong>
                  <small>solar</small>
                </span>

                <span>
                  <strong>
                    ${this.escape(
                      system.battery ?? 0
                    )}%
                  </strong>
                  <small>battery</small>
                </span>

                <span>
                  <strong>
                    ${this.escape(
                      system.gsm ||
                      "Unknown"
                    )}
                  </strong>
                  <small>SMS</small>
                </span>

              </div>

            </section>


            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">
                  Observation
                </span>

                ${App.statusBadge(
                  "info",
                  "Responder"
                )}

              </div>

              <button
                type="button"
                class="btn btn-primary"
                onclick="Monitoring.sendObservation()">

                ${App.icons.send}

                Send Field Observation

              </button>

            </section>


            ${App.responderBottomNav(
              "monitoring"
            )}

          </div>

        </section>
      `;

      this.chart = null;

    },


    /* =====================================================
       MOBILE SENSOR
       ===================================================== */

    mobileSensor(sensor) {

      const reading =
        Number(sensor.lastReading || 0);

      const readingStatus =
        typeof RescueData.status ===
        "function"
          ? RescueData.status(reading)
          : {
              key: "safe",
              color: "inherit"
            };

      const sensorStatus =
        String(
          sensor.status || ""
        ).toLowerCase();

      return `

        <div
          class="mobile-route-item
          ${this.escape(readingStatus.key)}">

          <div>

            <strong>
              ${this.escape(sensor.id)}
              -
              ${this.escape(sensor.name)}
            </strong>

            <small>
              ${this.escape(sensor.device)}
              -
              ${this.escape(sensor.signal)}
              signal
            </small>

          </div>

          <div class="sensor-reading-stack">

            <strong
              style="color:${this.escape(
                readingStatus.color ||
                "inherit"
              )}">

              ${reading.toFixed(1)} cm

            </strong>

            ${App.statusBadge(
              sensorStatus === "online"
                ? "safe"
                : "warning",
              sensor.status ||
              "Unknown"
            )}

          </div>

        </div>
      `;
    },


    /* =====================================================
       LIVE MONITORING SUMMARY
       ===================================================== */

    liveMonitoringPanel() {

      const waterLevel =
        Number(
          RescueData.currentWaterLevel ?? 0
        );

      const status =
        typeof RescueData.status === "function"
          ? RescueData.status(waterLevel)
          : {
              key: "safe",
              label: "Safe"
            };

      const system =
        RescueData.system || {};

      const connection =
        String(
          system.internet || "Unknown"
        );

      const connectionTone =
        connection
          .toLowerCase()
          .includes("online")
          ? "safe"
          : connection
              .toLowerCase()
              .includes("connect")
          ? "warning"
          : "info";

      return `

        <article class="card card-pad live-monitor-summary">

          <div class="card-header">

            <h3>
              Live Monitoring
            </h3>

          </div>

          <div class="live-monitor-items">

            <div class="live-monitor-item">

              <div>

                <span class="eyebrow">
                  Water Level
                </span>

                <strong class="live-monitor-value">
                  ${this.escape(waterLevel)} cm
                </strong>

              </div>

              <span class="live-monitor-icon">
                ${App.icons.water}
              </span>

            </div>


            <div class="live-monitor-item">

              <div>

                <span class="eyebrow">
                  Sensor Status
                </span>

                ${App.statusBadge(
                  status.key || "safe",
                  status.label || "Unknown"
                )}

              </div>

              <span class="live-monitor-icon">
                ${App.icons.activity}
              </span>

            </div>


            <div class="live-monitor-item">

              <div>

                <span class="eyebrow">
                  Connection
                </span>

                ${App.statusBadge(
                  connectionTone,
                  connection
                )}

              </div>

              <span class="live-monitor-icon">
                ${App.icons.signal}
              </span>

            </div>

          </div>

        </article>
      `;
    },


    /* =====================================================
       ROLE PANEL
       ===================================================== */

    rolePanel(role) {

      if (role === "admin") {

        return `

          <article class="card card-pad">

            <h3 style="margin-bottom:12px">
              Admin Sensor Controls
            </h3>

            <div class="stack-sm">

              <button
                type="button"
                class="btn btn-secondary"
                onclick="Monitoring.calibrate()">

                ${App.icons.activity}

                Calibrate Sensor

              </button>

              <button
                type="button"
                class="btn btn-warning"
                onclick="Monitoring.testBackup()">

                ${App.icons.bell}

                Test Siren and Lights

              </button>

              <a
                class="btn btn-primary"
                href="admin.html">

                ${App.icons.admin}

                Manage Thresholds

              </a>

            </div>

          </article>
        `;
      }

      return `

        <article class="card card-pad">

          <h3 style="margin-bottom:12px">
            Responder Monitoring
          </h3>

          <div class="stack-sm">

            <button
              type="button"
              class="btn btn-warning"
              onclick="Monitoring.sendObservation()">

              ${App.icons.send}

              Send Field Observation

            </button>

            <a
              class="btn btn-secondary"
              href="map.html">

              ${App.icons.map}

              Check Routes

            </a>

            <a
              class="btn btn-secondary"
              href="alerts.html">

              ${App.icons.bell}

              Open Alerts

            </a>

          </div>

        </article>
      `;
    },


    /* =====================================================
       RANGE
       ===================================================== */

    setRange(hours) {

      const allowed = [
        1,
        6,
        24,
        168
      ];

      this.range =
        allowed.includes(hours)
          ? hours
          : 6;

      this.render();
    },


    /* =====================================================
       ADMIN CONTROLS
       ===================================================== */

    calibrate() {

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      App.showModal(
        "Calibrate Sensor",

        `
          <p class="text-2">
            Select a monitoring node for demo calibration.
          </p>

          <label
            class="form-group"
            style="margin-top:12px">

            <span class="form-label">
              Sensor
            </span>

            <select class="form-select">

              ${
                sensors
                  .map(sensor => `
                    <option>
                      ${this.escape(sensor.id)}
                      -
                      ${this.escape(sensor.name)}
                    </option>
                  `)
                  .join("")
              }

            </select>

          </label>
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
            onclick="
              App.closeModal();
              App.toast(
                'Calibration saved for demo.',
                'success'
              )
            ">

            Save

          </button>
        `
      );
    },


    testBackup() {

      App.toast(
        "Siren and warning light test triggered for demo.",
        "warning"
      );

    },


    /* =====================================================
       FIELD OBSERVATION
       ===================================================== */

    sendObservation() {

      App.showModal(

        "Field Observation",

        `
          <label class="form-group">

            <span class="form-label">
              Observation
            </span>

            <textarea>
Water is approaching the warning marker near Creek Side Road.
            </textarea>

          </label>
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
            onclick="
              App.closeModal();
              App.toast(
                'Field observation sent.',
                'success'
              )
            ">

            Submit

          </button>
        `
      );
    },


    /* =====================================================
       LIVE UPDATE
       ===================================================== */

    tick() {

      try {

        if (
          typeof RescueData.updateWaterLevel ===
          "function"
        ) {

          RescueData.updateWaterLevel();

        }

      } catch (error) {

        console.error(
          "Monitoring update failed:",
          error
        );

      }


      /*
       * Update responder sensors without creating
       * additional simulated chart points.
       */

      const sensorList =
        document.getElementById(
          "responder-sensor-list"
        );

      if (sensorList) {

        const sensors =
          Array.isArray(
            RescueData.sensors
          )
            ? RescueData.sensors
            : [];

        sensorList.innerHTML =
          sensors
            .map(sensor =>
              this.mobileSensor(sensor)
            )
            .join("");

      }

    },


    /* =====================================================
       ESCAPE
       ===================================================== */

    escape(value) {

      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }

  };


  /* =======================================================
     INITIAL PAGE RENDER
     ======================================================= */

  Monitoring.render();


  /* =======================================================
     FIREBASE / DATA UPDATE
     ======================================================= */

  window.addEventListener(
    "RescueDataUpdated",
    function () {

      Monitoring.render();

    }
  );


  /*
   * Update live values every 2 seconds.
   */
  Monitoring.timer =
    setInterval(
      () => Monitoring.tick(),
      2000
    );

}