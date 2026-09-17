(function () {
  "use strict";

  const session = App.getSession();

  const DashboardTitles = {
    admin: "Main Dashboard",
    resident: "Resident Safety",
    responder: "Responder Field Console"
  };

  const pageTitle =
    DashboardTitles[session.role] || "Main Dashboard";

  if (!App.initPage("dashboard", pageTitle)) {
    return;
  }


  window.Dashboard = {

    chart: null,

    timer: null,

    lastStatusKey: null,

    /* =====================================================
       SHARED DATA HELPERS
       ===================================================== */

    getAlerts() {

      if (
        window.RescueData &&
        typeof RescueData.getAlerts ===
        "function"
      ) {

        const alerts =
          RescueData.getAlerts();

        return Array.isArray(alerts)
          ? alerts
              .slice()
              .sort(
                (a, b) => {

                  const dateA =
                    new Date(
                      a.createdAt ||
                      a.firebaseCreatedAt ||
                      a.time ||
                      0
                    ).getTime();

                  const dateB =
                    new Date(
                      b.createdAt ||
                      b.firebaseCreatedAt ||
                      b.time ||
                      0
                    ).getTime();

                  return dateB - dateA;
                }
              )
          : [];
      }

      return Array.isArray(
        RescueData?.alerts
      )
        ? RescueData.alerts
        : [];
    },

    getEvacuationCenters() {

      if (
        window.RescueData &&
        typeof RescueData.getEvacuationCenters ===
        "function"
      ) {

        const centers =
          RescueData.getEvacuationCenters();

        return Array.isArray(centers)
          ? centers
          : [];
      }

      return Array.isArray(
        RescueData?.evacuationCenters
      )
        ? RescueData.evacuationCenters
        : [];
    },

    getRoutes() {

      if (
        window.RescueData &&
        typeof RescueData.getRoutes ===
        "function"
      ) {

        const routes =
          RescueData.getRoutes();

        return Array.isArray(routes)
          ? routes
          : [];
      }

      return Array.isArray(
        RescueData?.routes
      )
        ? RescueData.routes
        : [];
    },

    getResidentEvacuationCenter(
      session
    ) {

      const centers =
        this.getEvacuationCenters();

      if (!centers.length) {
        return null;
      }

      const barangay =
        String(
          session?.barangay ||
          ""
        )
          .trim()
          .toLowerCase();

      const openCenters =
        centers.filter(
          center => {

            const status =
              String(
                center.status ||
                "Open"
              ).toLowerCase();

            return (
              status !== "blocked" &&
              status !== "closed" &&
              status !== "full"
            );
          }
        );

      const candidates =
        openCenters.length
          ? openCenters
          : centers;

      if (barangay) {

        const sameBarangay =
          candidates.find(
            center =>
              String(
                center.barangay ||
                ""
              )
                .trim()
                .toLowerCase() ===
              barangay
          );

        if (sameBarangay) {
          return sameBarangay;
        }
      }

      return candidates[0];
    },

    getResidentRoute(
      center,
      session
    ) {

      const routes =
        this.getRoutes();

      if (!routes.length) {
        return null;
      }

      const barangay =
        String(
          session?.barangay ||
          center?.barangay ||
          ""
        )
          .trim()
          .toLowerCase();

      return (
        routes.find(
          route =>
            String(
              route.barangay ||
              ""
            )
              .trim()
              .toLowerCase() ===
            barangay
        ) ||
        routes.find(
          route =>
            String(
              route.status ||
              "Open"
            ).toLowerCase() !==
            "blocked"
        ) ||
        routes[0]
      );
    },

    getLatestAlert() {

      const alerts =
        this.getAlerts();

      return alerts[0] || null;
    },

    render() {

      const currentSession =
        App.getSession();

      const status =
        RescueData.status();

      const root =
        document.getElementById(
          "dashboard-root"
        );

      if (!root) {
        console.error(
          "Dashboard root element not found."
        );
        return;
      }

      document.body.classList.toggle(
        "resident-mode",
        currentSession.role === "resident"
      );

      document.body.classList.toggle(
        "responder-mode",
        currentSession.role === "responder"
      );

      this.lastStatusKey =
        status.key;

      /*
       * Destroy the previous chart reference
       * before rebuilding the dashboard.
       */
      this.chart = null;

      if (currentSession.role === "resident") {
        this.renderResident(
          currentSession,
          status
        );
        return;
      }

      if (currentSession.role === "responder") {
        this.renderResponder(status);
        return;
      }

      this.renderAdmin(status);
    },

    /* =====================================================
       RESIDENT DASHBOARD
       ===================================================== */

    renderResident(
      session,
      status
    ) {

      const firstName =
        String(session.name || "Resident")
          .split(" ")[0] ||
        "Resident";

      const center =
        this.getResidentEvacuationCenter(
          session
        );

      const route =
        this.getResidentRoute(
          center,
          session
        );

      const latestAlert =
        this.getLatestAlert();

      const centerStatus =
        center?.status ||
        "Ready";

      const centerDistance =
        center?.distance ||
        center?.distanceKm ||
        "—";

      const centerCapacity =
        center &&
        Number.isFinite(
          Number(center.capacity)
        )
          ? (
              Number(center.capacity) -
              Number(center.occupied || 0)
            )
          : "—";

      const routeInstruction =
        route?.instruction ||
        route?.description ||
        (
          center
            ? "Follow the recommended route to the evacuation center."
            : "No evacuation center information is available yet."
        );

      const latestAlertData =
        latestAlert || {
          type: "info",
          level: "Information",
          message:
            "No active alerts at this time.",
          channels: ["Dashboard"]
        };

      const myRequests =
        typeof RescueData.requestsByEmail === "function"
          ? RescueData.requestsByEmail(
              session.email
            )
          : [];

      const request =
        myRequests?.[0] || null;

      const root =
        document.getElementById(
          "dashboard-root"
        );

      if (!root) return;

      root.innerHTML = `

        <section class="resident-shell">

          <div class="resident-phone">

            ${App.residentTopBar(status)}

            <section class="resident-hero ${status.key}">

              <div>

                <span class="eyebrow">
                  Hello, ${this.escape(firstName)}
                </span>

                <h2>
                  ${
                    status.key === "danger"
                      ? "Evacuate now"
                      : "Stay ready and informed"
                  }
                </h2>

                <p>
                  ${this.escape(status.action)}
                </p>

              </div>

              <div class="resident-level">

                <strong id="resident-level">
                  ${this.escape(
                    RescueData.currentWaterLevel
                  )}
                </strong>

                <span>cm</span>

              </div>

            </section>

            <section class="resident-actions">

              <div class="resident-action-grid">

                <button
                  type="button"
                  onclick="Dashboard.reportFlood()">

                  ${App.icons.send}

                  <span>
                    Send Report
                  </span>

                </button>

                <button
                  type="button"
                  onclick="Dashboard.residentSafe()">

                  ${App.icons.shield}

                  <span>
                    I Am Safe
                  </span>

                </button>

                <a href="map.html">

                  ${App.icons.map}

                  <span>
                    Map
                  </span>

                </a>

                <button
                  type="button"
                  onclick="Dashboard.hotlines()">

                  ${App.icons.phone}

                  <span>
                    Hotlines
                  </span>

                </button>

              </div>

            </section>

            ${
              request
                ? `

                  <section class="resident-card resident-request-card">

                    <div class="mobile-card-head">

                      <span class="eyebrow">
                        SOS Status
                      </span>

                      ${App.statusBadge(
                        request.status === "Pending"
                          ? "warning"
                          : request.status === "Resolved"
                          ? "safe"
                          : "info",
                        request.status || "Pending"
                      )}

                    </div>

                    <h3>
                      SOS request active
                    </h3>

                    <p>
                      Responders can see your location:
                      ${this.escape(
                        request.location || "Unknown"
                      )}.
                    </p>

                  </section>

                `
                : ""
            }

            <section class="resident-card route">

              <div class="resident-card-head">

                <span class="eyebrow">
                  Nearest Evacuation
                </span>

                ${App.statusBadge(
                  String(
                    centerStatus
                  ).toLowerCase() === "blocked" ||
                  String(
                    centerStatus
                  ).toLowerCase() === "closed"
                    ? "danger"
                    : "safe",
                  centerStatus
                )}

              </div>

              <h3>
                ${this.escape(
                  center?.name ||
                  "Nearest Evacuation Center"
                )}
              </h3>

              <p>
                ${this.escape(
                  routeInstruction
                )}
              </p>

              <div class="resident-mini-grid">

                <span>

                  <strong>
                    ${this.escape(
                      centerDistance
                    )}
                  </strong>

                  <small>
                    distance
                  </small>

                </span>

                <span>

                  <strong>
                    ${this.escape(
                      centerCapacity
                    )}
                  </strong>

                  <small>
                    capacity
                  </small>

                </span>

              </div>

              <a
                class="btn btn-primary"
                href="map.html">

                ${App.icons.map}

                Open Evacuation Map

              </a>

            </section>

            <section class="resident-card">

              <div class="resident-card-head">

                <span class="eyebrow">
                  Latest Alert
                                </span>

                <a href="alerts.html">
                  View all
                </a>

              </div>

              <div class="resident-alert ${this.escape(
                latestAlertData.type
              )}">

                <strong>
                  ${this.escape(
                    latestAlertData.level
                  )}
                </strong>

                <p>
                  ${this.escape(
                    latestAlertData.message
                  )}
                </p>

                <span>
                  ${
                    Array.isArray(
                      latestAlertData.channels
                    )
                      ? latestAlertData.channels
                          .map(
                            channel =>
                              this.escape(channel)
                          )
                          .join(" + ")
                      : "Dashboard"
                  }
                </span>

              </div>

            </section>

            <section class="resident-card">

              <div class="resident-card-head">

                <span class="eyebrow">
                  Offline Alerts
                </span>

                ${App.statusBadge(
                  "safe",
                  "Ready"
                )}

              </div>

              <div class="resident-mini-grid">

                <span>

                  <strong>
                    ${this.escape(
                      RescueData.system?.gsm ||
                      "Available"
                    )}
                  </strong>

                  <small>
                    SMS
                  </small>

                </span>

                <span>

                  <strong>
                    ${this.escape(
                      RescueData.system?.siren ||
                      "Ready"
                    )}
                  </strong>

                  <small>
                    siren
                  </small>

                </span>

                <span>

                  <strong>
                    ${this.escape(
                      RescueData.system?.lights ||
                      "Ready"
                    )}
                  </strong>

                  <small>
                    lights
                  </small>

                </span>

              </div>

            </section>

            ${App.residentBottomNav(
              "dashboard"
            )}

          </div>

        </section>
      `;

      this.chart = null;
    },

  
    renderResponder(status) {

      const alerts =
        this.getAlerts();

      const routes =
        this.getRoutes();

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const activeAlerts =
        alerts.filter(
          alert =>
            alert.type !== "safe"
        ).length;

      const openRoutes =
        routes.filter(
          route =>
            route.status !== "Blocked"
        ).length;

      const rescueRequests =
        typeof RescueData.openRescueRequests ===
        "function"
          ? RescueData.openRescueRequests()
          : [];

      const root =
        document.getElementById(
          "dashboard-root"
        );

      if (!root) return;

      root.innerHTML = `

        <section class="mobile-app-shell">

          <div class="mobile-app responder-app">

            ${App.responderTopBar(status)}

            <section
              class="responder-hero-mobile ${status.key}">

              <div>

                <span class="eyebrow">
                  Field Operations
                </span>

                <h2>
                  ${
                    status.key === "danger"
                      ? "Evacuation support needed"
                      : "Ready for field response"
                  }
                </h2>

                <p>
                  ${this.escape(
                    status.action
                  )}
                </p>

              </div>

              <div class="responder-level-mobile">

                <strong id="dash-level">
                  ${this.escape(
                    RescueData.currentWaterLevel
                  )}
                </strong>

                <span>
                  cm
                </span>

              </div>

            </section>

            <section class="responder-stat-grid">

              <span>

                <strong>
                  ${rescueRequests.length}
                </strong>

                <small>
                  rescue requests
                </small>

              </span>

              <span>

                <strong>
                  ${openRoutes}/${routes.length}
                </strong>

                <small>
                  open routes
                </small>

              </span>

              <span>

                <strong>
                  ${
                    typeof RescueData.onlineSensors ===
                    "function"
                      ? RescueData.onlineSensors()
                      : sensors.filter(
                          sensor =>
                            sensor.status === "online"
                        ).length
                  }/${sensors.length}
                </strong>

                <small>
                  sensors
                </small>

              </span>

            </section>

            <section class="responder-action-grid-mobile">

              <button
                type="button"
                class="primary"
                onclick="Dashboard.dispatchReport()">

                ${App.icons.send}

                <span>
                  Field Report
                </span>

              </button>

              <button
                type="button"
                onclick="Dashboard.acknowledge()">

                ${App.icons.bell}

                <span>
                  Acknowledge
                </span>

              </button>

              <button
                type="button"
                onclick="Dashboard.updateRoute()">

                ${App.icons.map}

                <span>
                  Road Status
                </span>

              </button>

              <a href="monitoring.html">

                ${App.icons.activity}
                                 <span>
                  Sensors
                </span>

              </a>

            </section>

            <section class="mobile-card">

              <div class="mobile-card-head">

                <span class="eyebrow">
                  People Needing Rescue
                </span>

                <a href="map.html">
                  Open map
                </a>

              </div>

              <div
                class="mobile-route-list"
                id="rescue-request-list">

                ${
                  rescueRequests.length
                    ? rescueRequests
                        .map(
                          request =>
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
                  Latest Alerts
                </span>

                <a href="alerts.html">
                  View all
                </a>

              </div>

              <div class="mobile-route-list">

                ${
                  alerts.length
                    ? alerts
                        .slice(0, 3)
                        .map(
                          alert => `
                            <div
                              class="mobile-route-item alert ${this.escape(
                                alert.type
                              )}">

                              <div>

                                <strong>
                                  ${this.escape(
                                    alert.level
                                  )}
                                </strong>

                                <small>
                                  ${this.escape(
                                    alert.message
                                  )}
                                </small>

                              </div>

                              ${App.statusBadge(
                                alert.type === "danger"
                                  ? "danger"
                                  : alert.type === "warning"
                                  ? "warning"
                                  : "info",
                                alert.sensor ||
                                  "System"
                              )}

                            </div>
                          `
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

            ${App.responderBottomNav(
              "dashboard"
            )}

          </div>

        </section>
      `;

      this.chart = null;
    },

    /* =====================================================
       ADMIN DASHBOARD
       ===================================================== */

    renderAdmin(status) {

      const alerts =
        this.getAlerts();

      const sensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      const activeAlerts =
        alerts.filter(
          alert =>
            alert.type !== "safe"
        ).length;

      const latestAlert =
        alerts[0] || {
          level: "No active alerts"
        };

      const root =
        document.getElementById(
          "dashboard-root"
        );

      if (!root) return;

      root.innerHTML = `

        <section
          class="grid-4"
          style="margin-bottom:16px">

          ${this.metric(
            "Water Level",
            `${RescueData.currentWaterLevel} cm`,
            "Trend rising",
            status.key,
            App.icons.water,
            "dash-water-kpi",
            "dash-water-caption"
          )}

          ${this.metric(
            "Flood Status",
            status.label,
            status.action,
            status.key,
            App.icons.shield,
            "dash-status-kpi",
            "dash-status-caption"
          )}

          ${this.metric(
            "Active Alerts",
            activeAlerts,
            `${latestAlert.level} latest`,
            "info",
            App.icons.bell,
            "dash-alerts-kpi",
            "dash-alerts-caption"
          )}

          ${this.metric(
            "System Health",
            "Online",
            `${
              typeof RescueData.onlineSensors ===
              "function"
                ? RescueData.onlineSensors()
                : sensors.filter(
                    sensor =>
                      sensor.status === "online"
                  ).length
            }/${sensors.length} sensors active`,
            "safe",
            App.icons.signal,
            "dash-health-kpi",
            "dash-health-caption"
          )}

        </section>

        <section
          class="status-banner ${status.key}"
          style="margin-bottom:16px">

          <span
            id="dash-status-badge"
            class="badge ${status.key}">

            <span class="dot"></span>

            Admin View -
            ${this.escape(status.label)}

          </span>

          <div class="status-main">

            <strong
              id="dash-level"
              style="color:${this.escape(
                status.color
              )}">

              ${this.escape(
                RescueData.currentWaterLevel
              )}

            </strong>

            <span class="muted">
              cm
            </span>

          </div>

          <p class="text-2">
            ${this.escape(status.action)}
          </p>

          <div class="status-details">

            <div>

              <span class="eyebrow">
                Location
              </span>

              <strong>
                ${this.escape(
                  RescueData.study
                    ?.primaryBarangay ||
                  "Barangay"
                )}
                Creek Monitoring Point
              </strong>

            </div>

            <div>

              <span class="eyebrow">
                Rainfall
              </span>

              <strong id="dash-rainfall">
                ${this.escape(
                  RescueData.rainfall
                    ?.condition ||
                  "Unknown"
                )}
                (
                ${this.escape(
                  RescueData.rainfall
                    ?.intensity ??
                  "0"
                )}
                mm/hr)
              </strong>

            </div>

            <div>

              <span class="eyebrow">
                Last Sync
              </span>

              <strong id="dash-sync">
                ${new Date().toLocaleTimeString(
                  "en-PH"
                )}
              </strong>

            </div>
                      </div>

        </section>

        <section class="layout-2">

          <div class="stack">

            <article class="card card-pad">

              <div class="card-header">

                <h3>
                  Water Level - Last 6 Hours
                </h3>

                <a
                  class="btn btn-ghost"
                  href="monitoring.html">

                  Open Monitoring

                </a>

              </div>

              <div class="mini-chart">

                <canvas id="dash-chart"></canvas>

              </div>

            </article>

            <article class="card card-pad">

              <div class="card-header">

                <h3>
                  Recent Alerts
                </h3>

                <a
                  class="btn btn-ghost"
                  href="alerts.html">

                  View All

                </a>

              </div>

              <div class="timeline alert-list">

                ${
                  alerts.length
                    ? alerts
                        .slice(0, 5)
                        .map(
                          alert =>
                            this.alertItem(
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

            </article>

          </div>

          <aside class="stack">

            ${this.quickActions()}

            ${this.sensorLocations()}

            ${this.communityUpdates()}

          </aside>

        </section>
      `;

      /*
       * Create chart only when the chart library
       * and canvas are available.
       */

      const canvas =
        document.getElementById(
          "dash-chart"
        );

      if (
        canvas &&
        typeof RescueCharts !== "undefined" &&
        typeof RescueCharts.lineChart ===
          "function"
      ) {

        try {

          this.chart =
            RescueCharts.lineChart(
              canvas,
              RescueData.history(6)
            );

        } catch (error) {

          console.error(
            "Unable to create dashboard chart:",
            error
          );

          this.chart = null;
        }
      }
    },

    /* =====================================================
       METRIC CARD
       ===================================================== */

    metric(
      label,
      value,
      caption,
      type,
      icon,
      valueId = "",
      captionId = ""
    ) {

      return `

        <article class="card metric ${this.escape(
          type
        )}">

          <div class="metric-top">

            <span class="eyebrow">
              ${this.escape(label)}
            </span>

            <span class="metric-icon">
              ${icon}
            </span>

          </div>

          <div
            class="metric-value"
            ${valueId ? `id="${this.escape(valueId)}"` : ""}>
            ${this.escape(value)}
          </div>

          <p
            class="metric-caption"
            ${captionId ? `id="${this.escape(captionId)}"` : ""}>
            ${this.escape(caption)}
          </p>

        </article>
      `;
    },

    /* =====================================================
       ALERT ITEM
       ===================================================== */

    alertItem(alert) {

      return `

        <div class="timeline-item ${this.escape(
          alert.type || "info"
        )}">

          <div class="timeline-time">

            ${this.escape(
              alert.time || ""
            )}

            -

            ${this.escape(
              alert.level || "Alert"
            )}

          </div>

          <div class="timeline-title">

            ${this.escape(
              alert.sensor || "System"
            )}

          </div>

          <div class="timeline-desc">

            ${this.escape(
              alert.message || ""
            )}

          </div>

        </div>
      `;
    },

    /* =====================================================
       RESCUE REQUEST ITEM
       ===================================================== */

    rescueRequestItem(request) {

      const tone =
        request.priority === "Critical"
          ? "danger"
          : request.status === "Pending"
          ? "warning"
          : "info";

      return `

        <div class="mobile-route-item ${tone}">

          <div>

            <strong>
              ${this.escape(
                request.reporter
              )}
              -
              ${this.escape(
                request.type
              )}
            </strong>

            <small>
              ${this.escape(
                request.location
              )}
              :
              ${this.escape(
                request.note
              )}
            </small>

          </div>

          <div class="request-actions">

            ${App.statusBadge(
              tone,
              request.status || "Pending"
            )}

            ${
              request.status !== "Resolved"
                ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="Dashboard.assignRequest('${this.escape(
                      request.id
                    )}')">

                    Assign

                  </button>

                  <button
                    type="button"
                    class="btn btn-primary"
                    onclick="Dashboard.resolveRequest('${this.escape(
                      request.id
                    )}')">

                    Resolved

                  </button>
                `
                : ""
            }

          </div>

        </div>
      `;
    },
         /* =====================================================
       ADMIN QUICK ACTIONS
       ===================================================== */

    quickActions() {

      return `

        <article class="card card-pad">

          <h3 style="margin-bottom:12px">
            Admin Controls
          </h3>

          <div class="stack-sm">

            <button
              type="button"
              class="btn btn-danger"
              onclick="Dashboard.sendAlert()">

              ${App.icons.bell}

              Send Emergency Alert

            </button>

            <button
              type="button"
              class="btn btn-warning"
              onclick="Dashboard.announce()">

              ${App.icons.send}

              Make Announcement

            </button>

            <a
              class="btn btn-secondary"
              href="admin.html">

              ${App.icons.admin}

              System Settings

            </a>

          </div>

        </article>
      `;
    },

    /* =====================================================
       OFFLINE READINESS
       ===================================================== */

    offlineReadiness(role) {

      const title =
        role === "resident"
          ? "Alert Availability"
          : "Offline Readiness";

      const system =
        RescueData.system || {};

      return `

        <article class="card card-pad">

          <div class="card-header">

            <h3>
              ${title}
            </h3>

            ${App.statusBadge(
              "safe",
              "Fallback Ready"
            )}

          </div>

          <div class="kpi-line">

            <span>
              Internet
            </span>

            ${App.statusBadge(
              "warning",
              system.internet || "Unknown"
            )}

          </div>

          <div class="kpi-line">

            <span>
              SMS Gateway
            </span>

            ${App.statusBadge(
              "safe",
              system.gsm || "Available"
            )}

          </div>

          <div class="kpi-line">

            <span>
              Siren / Lights
            </span>

            <strong>
              ${this.escape(
                system.siren || "Ready"
              )}
              /
              ${this.escape(
                system.lights || "Ready"
              )}
            </strong>

          </div>

          <div class="kpi-line">

            <span>
              Solar Battery
            </span>

            <strong>
              ${this.escape(
                system.battery ?? "—"
              )}%
            </strong>

          </div>

        </article>
      `;
    },

    /* =====================================================
       SENSOR LOCATIONS
       ===================================================== */

    sensorLocations() {

      const allSensors =
        Array.isArray(RescueData.sensors)
          ? RescueData.sensors
          : [];

      /*
       * Dashboard location cards should show live
       * sensors supplied by RTDB, not demo Firestore
       * sensor entries.
       */
      const sensors =
        allSensors.filter(
          sensor =>
            sensor.source === "Realtime Database"
        );

      return `

        <article class="card card-pad">

          <div class="card-header">

            <h3>
              Sensor Locations
            </h3>

            <a
              class="btn btn-ghost"
              href="map.html">

              Map

            </a>

          </div>

          <div class="stack-sm">

            ${
              sensors.length
                ? sensors
                    .map(
                      sensor => {

                        const sensorStatus =
                          RescueData.status(
                            sensor.lastReading
                          );

                        return `

                          <div class="sensor-card">

                            <div>

                              <strong>
                                ${this.escape(
                                  sensor.name
                                )}
                              </strong>

                              <br>

                              <span class="muted">

                                ${this.escape(
                                  sensor.id
                                )}

                                -

                                ${this.escape(
                                  sensor.device
                                )}

                              </span>

                            </div>

                            <strong
                              style="color:${this.escape(
                                sensorStatus.color
                              )}">

                              ${this.escape(
                                sensor.lastReading
                              )}
                              cm

                            </strong>

                          </div>
                        `;
                      }
                    )
                    .join("")
                : `
                  <div class="empty-state">
                    No sensors available.
                  </div>
                `
            }

          </div>

        </article>
      `;
    },

    /* =====================================================
       COMMUNITY UPDATES
       ===================================================== */

    communityUpdates() {

      const updates =
        Array.isArray(
          RescueData.communityUpdates
        )
          ? RescueData.communityUpdates
          : [];

      return `

        <article class="card card-pad">

          <div class="card-header">

            <h3>
              Community Updates
            </h3>

            <a
              class="btn btn-ghost"
              href="alerts.html">

              Open

            </a>

          </div>

          <div class="timeline">

            ${
              updates.length
                ? updates
                    .map(
                      update => `

                        <div class="timeline-item info">

                          <div class="timeline-time">

                            ${this.escape(
                              update.time
                            )}
                                                       -

                            ${this.escape(
                              update.author
                            )}

                          </div>

                          <div class="timeline-title">

                            ${this.escape(
                              update.title
                            )}

                          </div>

                          <div class="timeline-desc">

                            ${this.escape(
                              update.message
                            )}

                          </div>

                        </div>
                      `
                    )
                    .join("")
                : `
                  <div class="empty-state">
                    No community updates yet.
                  </div>
                `
            }

          </div>

        </article>
      `;
    },

    /* =====================================================
       ADMIN SEND ALERT
       ===================================================== */

    sendAlert() {

      App.showModal(
        "Send Emergency Alert",

        `

          <p class="text-2">

            Admin broadcast will simulate SMS,
            mobile app, siren, warning light,
            and dashboard delivery.

          </p>

          <label
            class="form-group"
            style="margin-top:14px">

            <span class="form-label">
              Message
            </span>

            <textarea id="dashboard-alert-message">

FLOOD WARNING: Water level in Barangay Marauoy has reached WARNING level. Residents near low-lying areas are advised to prepare for possible evacuation.

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
            class="btn btn-danger"
            onclick="Dashboard.confirmAlert()">

            Send Alert

          </button>

        `
      );
    },

    async confirmAlert() {

      const message =
        document.getElementById(
          "dashboard-alert-message"
        )?.value.trim();

      if (!message) {
        App.toast("Enter an alert message first.", "warning");
        return;
      }

      try {
        if (typeof RescueData.addAlert !== "function") {
          throw new Error("Alert service is unavailable.");
        }

        await RescueData.addAlert({
          type: "warning",
          level: "Warning",
          message,
          sensor: "Admin Broadcast",
          channels: [
            "Mobile App",
            "SMS Gateway",
            "Local Siren",
            "Warning Lights",
            "Dashboard"
          ]
        });

        App.closeModal();
        App.toast("Emergency alert sent to all channels.", "warning");
      } catch (error) {
        console.error("Unable to send emergency alert:", error);
        App.toast("Unable to send emergency alert.", "danger");
      }
    },

    /* =====================================================
       ADMIN ANNOUNCEMENT
       ===================================================== */

    announce() {

      App.showModal(
        "Make Announcement",

        `

          <label class="form-group">

            <span class="form-label">
              Announcement
            </span>

            <textarea
              id="dashboard-announcement"
              placeholder="Type verified barangay announcement..."
            ></textarea>

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
            onclick="Dashboard.confirmAnnouncement()">

            Post

          </button>

        `
      );
    },

    async confirmAnnouncement() {

      const message =
        document.getElementById(
          "dashboard-announcement"
        )?.value.trim();

      if (!message) {
        App.toast("Enter an announcement first.", "warning");
        return;
      }

      const session = App.getSession();

      try {
        if (typeof RescueData.addAnnouncement !== "function") {
          throw new Error("Announcement service is unavailable.");
        }

        await RescueData.addAnnouncement({
          title: "Community Announcement",
          message,
          author: session.name || "Administrator",
          email: session.email || ""
        });

        App.closeModal();
        App.toast("Announcement posted.", "success");
      } catch (error) {
        console.error("Unable to post announcement:", error);
        App.toast("Unable to post announcement.", "danger");
      }
    },

    /* =====================================================
       RESPONDER ACKNOWLEDGE
       ===================================================== */

    acknowledge() {

      App.toast(
        "Latest warning acknowledged by responder.",
        "success"
      );
    },

    /* =====================================================
       RESPONDER ROAD STATUS
       ===================================================== */

    updateRoute() {

      const roads =
        Array.isArray(RescueData.roads)
          ? RescueData.roads
          : [];

      if (!roads.length) {

        App.toast(
          "No road records are available.",
          "warning"
        );

        return;
      }

      App.showModal(
        "Update Road Status",

        `

          <label class="form-group">

            <span class="form-label">
              Road
            </span>

            <select
              class="form-select"
              id="dashboard-road">

              ${roads
                .map(
                  road => `
                    <option
                      value="${this.escape(
                        road.name
                      )}">

                      ${this.escape(
                        road.name
                      )}

                    </option>
                  `
                )
                .join("")}

            </select>

          </label>

          <label
            class="form-group"
            style="margin-top:12px">

            <span class="form-label">
              Status
            </span>

            <select
              class="form-select"
              id="dashboard-road-status">

              <option>
                Passable
              </option>

              <option>
                Flooded
              </option>

              <option>
                Closed
              </option>

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
            onclick="Dashboard.confirmRouteUpdate()">

            Submit

          </button>

        `
      );
    },

    async confirmRouteUpdate() {

      const roadName =
        document.getElementById("dashboard-road")?.value;

      const roadStatus =
        document.getElementById("dashboard-road-status")?.value;

      if (!roadName || !roadStatus) {
        App.toast("Please select a road and status.", "warning");
        return;
      }

      try {
        if (typeof RescueData.updateRoadStatus !== "function") {
          throw new Error("Road status service is unavailable.");
        }

        const updated =
          await RescueData.updateRoadStatus(roadName, roadStatus);

        if (!updated) {
          throw new Error("Road record was not found.");
        }

        App.closeModal();
        App.toast("Road status update submitted.", "success");
      } catch (error) {
        console.error("Unable to update road status:", error);
        App.toast("Unable to update road status.", "danger");
      }
    },

    /* =====================================================
       RESPONDER FIELD REPORT
       ===================================================== */

    dispatchReport() {

      App.showModal(
        "Send Field Report",

        `

          <label class="form-group">

            <span class="form-label">
              Responder Note
            </span>

            <textarea
              id="dashboard-field-report"
              required>

Team is checking Creek Side Road and guiding residents to Marauoy Barangay Hall.

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
            onclick="Dashboard.confirmFieldReport()">

            Send

          </button>

        `
      );
    },

    async confirmFieldReport() {

      const message =
        document.getElementById(
          "dashboard-field-report"
        )?.value.trim();

      if (!message) {
        App.toast("Enter a field report.", "warning");
        return;
      }

      const session = App.getSession();

      try {
        if (typeof RescueData.addFieldUpdate !== "function") {
          throw new Error("Field update service is unavailable.");
        }

        await RescueData.addFieldUpdate({
          title: "Field Update",
          message,
          author: session.name || "Field Team",
          email: session.email || ""
        });

        App.closeModal();
        App.toast("Field report sent to command dashboard.", "success");
      } catch (error) {
        console.error("Unable to send field report:", error);
        App.toast("Unable to send field report.", "danger");
      }
    },

    /* =====================================================
       ASSIGN REQUEST
       ===================================================== */

    assignRequest(id) {

      if (
        typeof RescueData.updateRescueRequest !== 
               "function"
      ) {

        App.toast(
          "Rescue request service is unavailable.",
          "danger"
        );

        return;
      }

      RescueData.updateRescueRequest(
        id,
        "Assigned"
      );

      App.toast(
        "Rescue request assigned to responder team.",
        "success"
      );

      this.render();
    },

    /* =====================================================
       RESOLVE REQUEST
       ===================================================== */

    resolveRequest(id) {

      if (
        typeof RescueData.updateRescueRequest !==
        "function"
      ) {

        App.toast(
          "Rescue request service is unavailable.",
          "danger"
        );

        return;
      }

      RescueData.updateRescueRequest(
        id,
        "Resolved"
      );

      App.toast(
        "Rescue request marked as resolved.",
        "success"
      );

      this.render();
    },

    /* =====================================================
       RESIDENT SAFETY
       ===================================================== */

    residentSafe() {

      App.toast(
        "Safety confirmation recorded for demo.",
        "success"
      );
    },

    residentSOS() {

      App.openResidentSOS();
    },

    residentHelp() {

      this.residentSOS();
    },

    /* =====================================================
       RESIDENT FLOOD REPORT
       ===================================================== */

    reportFlood() {

      const locations =
        Array.isArray(
          RescueData.requestLocations
        )
          ? RescueData.requestLocations
          : [];

      if (!locations.length) {

        App.toast(
          "No report locations are available.",
          "warning"
        );

        return;
      }

      App.showModal(
        "Send Flood Report",

        `

          <div class="stack-sm">

            <label class="form-group">

              <span class="form-label">
                Location
              </span>

              <select
                class="form-select"
                id="report-location">

                ${locations
                  .map(
                    location => `
                      <option
                        value="${this.escape(
                          location.name
                        )}">

                        ${this.escape(
                          location.name
                        )}

                      </option>
                    `
                  )
                  .join("")}

              </select>

            </label>

            <label class="form-group">

              <span class="form-label">
                What is happening?
              </span>

              <select
                class="form-select"
                id="report-type">

                <option>
                  Water is rising
                </option>

                <option>
                  Road is flooded
                </option>

                <option>
                  Need rescue assistance
                </option>

                <option>
                  Debris blocking road
                </option>

              </select>

            </label>

            <label class="form-group">

              <span class="form-label">
                Details
              </span>

              <textarea
                id="report-note"
                placeholder="Describe what you see..."
              ></textarea>

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
            onclick="Dashboard.submitFloodReport()">

            Send Report

          </button>

        `
      );
    },

    submitSOS() {

      App.submitResidentSOS();
    },

    submitFloodReport() {

      const session =
        App.getSession();

      const location =
        document.getElementById(
          "report-location"
        )?.value;

      const type =
        document.getElementById(
          "report-type"
        )?.value;

      const note =
        document.getElementById(
          "report-note"
        )?.value.trim();

      if (!location || !type) {

        App.toast(
          "Please complete the report.",
          "warning"
        );

        return;
      }

      if (
        typeof RescueData.addRescueRequest !==
        "function"
      ) {

        App.toast(
          "Unable to submit the flood report.",
          "danger"
        );

        return;
      }

      RescueData.addRescueRequest({

        type: "Flood Report",

        reporter:
          session.name ||
          "Resident",

        email:
          session.email ||
          "",

        location,

        note:
          `${type}: ${
            note ||
            "No extra details."
          }`,

        priority: "Medium"

      });

      App.closeModal();

      App.toast(
        "Report sent to responders.",
        "success"
      );

      this.render();
    },

    /* =====================================================
       EMERGENCY HOTLINES
       ===================================================== */

    hotlines() {

      const hotlines =
        Array.isArray(           RescueData.hotlines
        )
          ? RescueData.hotlines
          : [];

      const rows =
        hotlines.length
          ? hotlines
              .map(
                item => `

                  <div class="kpi-line">

                    <span>
                      ${this.escape(
                        item.name
                      )}
                    </span>

                    <strong>
                      ${this.escape(
                        item.number
                      )}
                    </strong>

                  </div>
                `
              )
              .join("")
          : `
              <div class="empty-state">
                No emergency hotlines configured.
              </div>
            `;

      App.showModal(
        "Emergency Hotlines",
        rows,
        `

          <button
            type="button"
            class="btn btn-secondary"
            onclick="App.closeModal()">

            Close

          </button>

        `
      );
    },

    /* =====================================================
       LIVE UPDATE
       ===================================================== */

    tick() {

      if (
        typeof RescueData.updateWaterLevel ===
        "function"
      ) {

        RescueData.updateWaterLevel();

      }

      const currentStatus =
        RescueData.status();

      /*
       * If the simulated water level crossed
       * into another status, rebuild the dashboard
       * so the warning state changes visually.
       */

      if (
        currentStatus.key !==
        this.lastStatusKey
      ) {

        this.render();

        return;
      }

      const level =
        document.getElementById(
          "dash-level"
        );

      const residentLevel =
        document.getElementById(
          "resident-level"
        );

      const sync =
        document.getElementById(
          "dash-sync"
        );

      if (level) {

        level.textContent =
          `${RescueData.currentWaterLevel} cm`;

      }

      if (residentLevel) {

        residentLevel.textContent =
          RescueData.currentWaterLevel;

      }

      if (sync) {

        sync.textContent =
          new Date().toLocaleTimeString(
            "en-PH"
          );

      }

      const waterKpi = document.getElementById("dash-water-kpi");
      const waterCaption = document.getElementById("dash-water-caption");
      const statusKpi = document.getElementById("dash-status-kpi");
      const statusCaption = document.getElementById("dash-status-caption");
      const alertsKpi = document.getElementById("dash-alerts-kpi");
      const alertsCaption = document.getElementById("dash-alerts-caption");
      const healthKpi = document.getElementById("dash-health-kpi");
      const healthCaption = document.getElementById("dash-health-caption");
      const statusBadge = document.getElementById("dash-status-badge");
      const rainfall = document.getElementById("dash-rainfall");

      const sensors = Array.isArray(RescueData.sensors) ? RescueData.sensors : [];
      const alerts = this.getAlerts();
      const activeAlerts = alerts.filter(alert => alert.type !== "safe").length;
      const latestAlert = alerts[0];
      const onlineCount = typeof RescueData.onlineSensors === "function"
        ? RescueData.onlineSensors()
        : sensors.filter(sensor => String(sensor.status).toLowerCase() === "online").length;

      if (waterKpi) waterKpi.textContent = `${RescueData.currentWaterLevel} cm`;
      if (waterCaption) waterCaption.textContent = "Live sensor reading";
      if (statusKpi) statusKpi.textContent = currentStatus.label;
      if (statusCaption) statusCaption.textContent = currentStatus.action;
      if (alertsKpi) alertsKpi.textContent = activeAlerts;
      if (alertsCaption) alertsCaption.textContent = `${latestAlert?.level || "No active alerts"} latest`;
      if (healthKpi) healthKpi.textContent = "Online";
      if (healthCaption) healthCaption.textContent = `${onlineCount}/${sensors.length} sensors active`;

      if (statusBadge) {
        statusBadge.className = `badge ${currentStatus.key}`;
        statusBadge.innerHTML = `<span class="dot"></span> Admin View - ${this.escape(currentStatus.label)}`;
      }

      if (level) level.style.color = currentStatus.color;

      if (rainfall) {
        const rain = RescueData.rainfall || {};
        rainfall.textContent = `${rain.condition || "Unknown"} (${rain.intensity ?? "0"} mm/hr)`;
      }

      /*
       * Update chart without rebuilding it.
       */

      if (this.chart) {

        try {

          const time =
            new Date().toLocaleTimeString(
              "en-PH",
              {
                hour: "2-digit",
                minute: "2-digit"
              }
            );

          this.chart.data.labels.push(
            time
          );

          this.chart.data.datasets[0].data.push(
            RescueData.currentWaterLevel
          );

          if (
            this.chart.data.labels.length >
            44
          ) {

            this.chart.data.labels.shift();

            this.chart.data.datasets[0].data.shift();

          }

          this.chart.update("none");

        } catch (error) {

          console.warn(
            "Unable to update dashboard chart:",
            error
          );

          this.chart = null;
        }
      }
    },

    /* =====================================================
       HTML ESCAPING
       ===================================================== */

    escape(value) {

      return String(value ?? "")
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );
    }

  };

  /* =======================================================
     START DASHBOARD
     ======================================================= */

  /*
   * Render immediately, then rebuild when the shared
   * Firestore data finishes loading or changes.
   */
  Dashboard.render();

  window.addEventListener(
    "RescueDataReady",
    function () {

      Dashboard.render();

    }
  );

  window.addEventListener(
    "RescueDataUpdated",
    function () {
      Dashboard.render();
    }
  );

  window.addEventListener(
    "RescueDataError",
    function (event) {

      console.error(
        "RESCUE-IOT: Dashboard data initialization error.",
        event.detail
      );

      Dashboard.render();

    }
  );

  if (
    window.RescueData &&
    typeof RescueData.initialize ===
    "function"
  ) {

    RescueData.initialize()
      .then(
        function () {

          Dashboard.render();

        }
      )
      .catch(
        function (error) {

          console.error(
            "RESCUE-IOT: Dashboard initialization failed.",
            error
          );

        }
      );
  }

  /*
   * Prevent duplicate dashboard intervals.
   */

  if (
    Dashboard.timer
  ) {

    clearInterval(
      Dashboard.timer
    );
  }

  Dashboard.timer =
    setInterval(
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {

          Dashboard.tick();

        }

      },
      3000
    );

})();