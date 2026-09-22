App.initPage(
  "map",
  "Marauoy Rescue Map",
  "Barangay Marauoy, Lipa City"
);

window.RescueMap = {
  map: null,
  layers: {},
  responderWatchId: null,
  responderLocationSharing: false,

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  getSession() {
    return App.getSession ? App.getSession() : null;
  },

  getSensors() {
    return this.getMarauoyItems(RescueData.sensors);
  },

  getCenters() {
    return this.getMarauoyItems(RescueData.evacuationCenters);
  },

  getRoutes() {
    return this.getMarauoyItems(RescueData.routes);
  },

  getRoads() {
    return this.getMarauoyItems(RescueData.roads);
  },

  getRequests() {
    if (Array.isArray(RescueData.rescueRequests)) {
      return this.getMarauoyItems(RescueData.rescueRequests);
    }

    if (typeof RescueData.openRescueRequests === "function") {
      return this.getMarauoyItems(RescueData.openRescueRequests());
    }

    return [];
  },

  getOpenRequests() {
    return this.getRequests().filter(
      (request) =>
        String(request.status || "").toLowerCase() !== "resolved" &&
        String(request.status || "").toLowerCase() !== "closed"
    );
  },

  isMarauoy(item) {
    if (!item) return false;

    const text = [
      item.barangay,
      item.location,
      item.address,
      item.name,
      item.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (text.includes("marauoy") || text.includes("marawoy")) {
      return true;
    }

    const latitude = Number(item.latitude ?? item.lat ?? item.location?.latitude);
    const longitude = Number(item.longitude ?? item.lng ?? item.location?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    // Marauoy, Lipa City service area. Used only to keep the map focused
    // when Firebase records do not include a barangay text field.
    return (
      latitude >= 13.94 &&
      latitude <= 13.99 &&
      longitude >= 121.14 &&
      longitude <= 121.20
    );
  },

  getMarauoyItems(items) {
    return (Array.isArray(items) ? items : []).filter(item =>
      this.isMarauoy(item)
    );
  },

  getResponderLocations() {
    return this.getMarauoyItems(
      Array.isArray(RescueData.responderLocations)
        ? RescueData.responderLocations
        : []
    );
  },

  getFloodZones() {
    return this.getMarauoyItems(
      Array.isArray(RescueData.floodZones)
        ? RescueData.floodZones
        : []
    );
  },

  getSensorStatus(sensor) {
    if (!sensor) {
      return {
        key: "offline",
        label: "Offline",
        color: "#64748b"
      };
    }

    if (typeof RescueData.sensorStatus === "function") {
      return RescueData.sensorStatus(sensor);
    }

    if (typeof RescueData.status === "function") {
      return RescueData.status(sensor.level);
    }

    return {
      key: "normal",
      label: "Normal",
      color: "#22c55e"
    };
  },

  getCoordinates(item) {
  if (!item) {
    return null;
  }

  let latitude =
    item.latitude ??
    item.lat;

  let longitude =
    item.longitude ??
    item.lng;

  /*
   * If the request does not contain coordinates,
   * find the coordinates using its location name.
   */
  if (
    (latitude === undefined || latitude === null) ||
    (longitude === undefined || longitude === null)
  ) {
    const locationName =
      typeof item.location === "string"
        ? item.location
        : "";

    const savedLocation =
      Array.isArray(RescueData.requestLocations)
        ? RescueData.requestLocations.find(
            (location) =>
              String(location.name)
                .toLowerCase()
                .trim() ===
              locationName
                .toLowerCase()
                .trim()
          )
        : null;

    if (savedLocation) {
      latitude =
        savedLocation.latitude ??
        savedLocation.lat;

      longitude =
        savedLocation.longitude ??
        savedLocation.lng;
    }
  }

  latitude = Number(latitude);
  longitude = Number(longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return [
    latitude,
    longitude
  ];
},

  routeLabel(route) {
    if (!route) {
      return "Evacuation Route";
    }

    if (route.from && route.to) {
      return `${route.from} to ${route.to}`;
    }

    return route.name || "Evacuation Route";
  },

  routeDescription(route) {
    if (!route) {
      return "";
    }

    if (route.instruction) {
      return route.instruction;
    }

    if (route.description) {
      return route.description;
    }

    return "";
  },

  centerAvailability(center) {
    if (!center) {
      return "Unknown";
    }

    const capacity = Number(center.capacity) || 0;
    const occupied = Number(center.occupied) || 0;

    if (capacity <= 0) {
      return center.status || "Unknown";
    }

    const remaining = Math.max(capacity - occupied, 0);

    return `${remaining} slots available`;
  },

  /* ---------------------------------------------------------
     Main render
  --------------------------------------------------------- */

  render() {
    const session = this.getSession() || {};

    if (session.role === "resident") {
      this.renderResident();
      return;
    }

    if (session.role === "responder") {
      this.renderResponder();
      return;
    }

    const root = document.getElementById("map-root");

    if (!root) {
      return;
    }

    root.innerHTML = `
      <section class="map-layout">
        <div id="rescue-map"></div>

        <aside class="map-side stack">
          ${this.sideContent(session.role)}
        </aside>
      </section>
    `;

    this.init();
  },

  /* ---------------------------------------------------------
     Resident
  --------------------------------------------------------- */

  renderResident() {
    const root = document.getElementById("map-root");

    if (!root) {
      return;
    }

    const session = this.getSession() || {};

    const status = this.getSensorStatus(
      this.getSensors()[0]
    );

    const routes = this.getRoutes();
    const centers = this.getCenters();
    const roads = this.getRoads();
    const requests = this.getRequests();

    const route = routes[0] || null;
    const center = centers[0] || null;

    let myRequests = [];

    if (
      session.email &&
      typeof RescueData.requestsByEmail === "function"
    ) {
      myRequests = RescueData.requestsByEmail(
        session.email
      );
    } else {
      myRequests = requests.filter(
        (request) =>
          request.email &&
          request.email === session.email
      );
    }

    root.innerHTML = `
      <section class="mobile-app-shell">
        <div class="mobile-app resident-map-app">

          ${
            typeof App.residentTopBar === "function"
              ? App.residentTopBar(status)
              : ""
          }

          <section class="mobile-card featured resident-map-route">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Recommended Route
              </span>

              ${
                typeof App.statusBadge === "function"
                  ? App.statusBadge(
                      route &&
                      route.status === "Caution"
                        ? "warning"
                        : "safe",

                      route
                        ? route.status
                        : "Open"
                    )
                  : ""
              }

            </div>

            <h2>
              ${this.escape(this.routeLabel(route))}
            </h2>

            <p>
              ${this.escape(
                this.routeDescription(route) ||
                "Follow the designated evacuation route and monitor official RESCUE-IOT alerts."
              )}
            </p>

            <div class="mobile-mini-grid">

              <span>
                <strong>
                  ${
                    route
                      ? this.escape(
                          route.barangay || "Local"
                        )
                      : "Local"
                  }
                </strong>
                <small>area</small>
              </span>

              <span>
                <strong>
                  ${
                    center
                      ? Number(center.capacity) || 0
                      : 0
                  }
                </strong>
                <small>capacity</small>
              </span>

              <span>
                <strong>
                  ${
                    center
                      ? Number(center.occupied) || 0
                      : 0
                  }
                </strong>
                <small>occupied</small>
              </span>

            </div>

          </section>

          <section class="resident-map-panel">
            <div id="rescue-map"></div>
          </section>

          ${
            myRequests.length
              ? `
                <section class="mobile-card">

                  <div class="mobile-card-head">

                    <span class="eyebrow">
                      My Location Request
                    </span>

                    ${
                      typeof App.statusBadge === "function"
                        ? App.statusBadge(
                            String(
                              myRequests[0].status || ""
                            ).toLowerCase() === "pending"
                              ? "warning"
                              : "info",

                            myRequests[0].status ||
                              "Submitted"
                          )
                        : ""
                    }

                  </div>

                  <h3>
                    ${this.escape(
                      myRequests[0].location ||
                      "Unknown location"
                    )}
                  </h3>

                  <p>
                    ${this.escape(
                      myRequests[0].note ||
                      "Emergency request submitted."
                    )}
                  </p>

                </section>
              `
              : ""
          }

          <section class="mobile-card">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Nearby Safe Centers
              </span>

              ${
                typeof App.statusBadge === "function"
                  ? App.statusBadge(
                      "safe",
                      "Evacuation Centers"
                    )
                  : ""
              }

            </div>

            <div class="mobile-center-list">

              ${
                centers.length
                  ? centers
                      .slice(0, 3)
                      .map(
                        (item) => `
                          <div class="mobile-center-item">

                            <div>

                              <strong>
                                ${this.escape(item.name)}
                              </strong>

                              <small>
                                ${this.escape(
                                  item.barangay || ""
                                )}
                                -
                                Capacity
                                ${Number(item.capacity) || 0}
                                -
                                Occupied
                                ${Number(item.occupied) || 0}
                              </small>

                            </div>

                            ${
                              typeof App.statusBadge === "function"
                                ? App.statusBadge(
                                    String(
                                      item.status || ""
                                    ).toLowerCase() ===
                                    "nearly full"
                                      ? "warning"
                                      : "safe",

                                    item.status || "Open"
                                  )
                                : ""
                            }

                          </div>
                        `
                      )
                      .join("")
                  : `
                      <p class="muted">
                        No evacuation centers available.
                      </p>
                    `
              }

            </div>

          </section>

          <section class="mobile-card">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Road Warnings
              </span>

              <a href="alerts.html">
                Alerts
              </a>

            </div>

            <div class="mobile-center-list">

              ${
                roads.filter(
                  (road) =>
                    String(
                      road.status || ""
                    ).toLowerCase() !== "passable"
                ).length
                  ? roads
                      .filter(
                        (road) =>
                          String(
                            road.status || ""
                          ).toLowerCase() !== "passable"
                      )
                      .map(
                        (road) => `
                          <div class="mobile-center-item">

                            <div>

                              <strong>
                                ${this.escape(road.name)}
                              </strong>

                              <small>
                                ${this.escape(
                                  road.note || ""
                                )}
                              </small>

                            </div>

                            ${
                              typeof App.roadBadge === "function"
                                ? App.roadBadge(
                                    road.status ||
                                    "Unknown"
                                  )
                                : ""
                            }

                          </div>
                        `
                      )
                      .join("")
                  : `
                      <p class="muted">
                        No road warnings.
                      </p>
                    `
              }

            </div>

          </section>

          ${
            typeof App.residentBottomNav === "function"
              ? App.residentBottomNav("map")
              : ""
          }

        </div>
      </section>
    `;

    this.init();

    setTimeout(() => {
      if (
        this.map &&
        typeof this.map.invalidateSize === "function"
      ) {
        this.map.invalidateSize();
      }
    }, 120);
  },

  /* ---------------------------------------------------------
     Responder
  --------------------------------------------------------- */

  renderResponder() {
    const root = document.getElementById("map-root");

    if (!root) {
      return;
    }

    const status = this.getSensorStatus(
      this.getSensors()[0]
    );

    const rescueRequests =
      this.getOpenRequests();

    const routes =
      this.getRoutes();

    root.innerHTML = `
      <section class="mobile-app-shell">

        <div class="mobile-app responder-app responder-map-app">

          ${
            typeof App.responderTopBar === "function"
              ? App.responderTopBar(status)
              : ""
          }

          <section class="mobile-card featured">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Rescue Map
              </span>

              ${
                typeof App.statusBadge === "function"
                  ? App.statusBadge(
                      rescueRequests.length
                        ? "danger"
                        : "safe",

                      `${rescueRequests.length} Requests`
                    )
                  : ""
              }

            </div>

            <h2>
              People needing rescue
            </h2>

            <p>
              Open requests are shown on the map and list below for dispatch.
            </p>

          </section>

          <section class="mobile-card responder-location-card">

            <div class="mobile-card-head">
              <span class="eyebrow">
                Responder Location
              </span>

              ${
                typeof App.statusBadge === "function"
                  ? App.statusBadge(
                      this.responderLocationSharing
                        ? "safe"
                        : "warning",
                      this.responderLocationSharing
                        ? "Sharing"
                        : "Not Sharing"
                    )
                  : ""
              }
            </div>

            <p>
              ${
                this.responderLocationSharing
                  ? "Your current GPS location is being shared with the rescue map."
                  : "Share your GPS location so the team can see where you are."
              }
            </p>

            <button
              class="btn ${
                this.responderLocationSharing
                  ? "btn-secondary"
                  : "btn-primary"
              }"
              type="button"
              onclick="${
                this.responderLocationSharing
                  ? "RescueMap.stopResponderLocationSharing()"
                  : "RescueMap.startResponderLocationSharing()"
              }"
            >
              ${
                this.responderLocationSharing
                  ? "Stop Sharing Location"
                  : "Share My Location"
              }
            </button>

          </section>

          <section class="resident-map-panel responder-map-panel">
            <div id="rescue-map"></div>
          </section>

          <section class="mobile-card">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Rescue Requests
              </span>

              ${
                typeof App.statusBadge === "function"
                  ? App.statusBadge(
                      rescueRequests.length
                        ? "warning"
                        : "safe",

                      rescueRequests.length
                        ? "Dispatch"
                        : "No Open Requests"
                    )
                  : ""
              }

            </div>

            <div class="mobile-center-list">

              ${
                rescueRequests.length
                  ? rescueRequests
                      .map((request) =>
                        this.responderRequestCard(request)
                      )
                      .join("")
                  : `
                      <p class="muted">
                        No open rescue requests.
                      </p>
                    `
              }

            </div>

          </section>

          <section class="mobile-card">

            <div class="mobile-card-head">

              <span class="eyebrow">
                Evacuation Routes
              </span>

              <a href="alerts.html">
                Alerts
              </a>

            </div>

            <div class="mobile-center-list">

              ${
                routes.length
                  ? routes
                      .map(
                        (route) => `
                          <div class="mobile-center-item">

                            <div>

                              <strong>
                                ${this.escape(
                                  route.name ||
                                  "Evacuation Route"
                                )}
                              </strong>

                              <small>
                                ${this.escape(
                                  route.description ||
                                  route.barangay ||
                                  ""
                                )}
                              </small>

                            </div>

                            <span class="road-actions">

                              ${
                                typeof App.statusBadge === "function"
                                  ? App.statusBadge(
                                      route.status === "Caution"
                                        ? "warning"
                                        : route.status === "Closed" ||
                                          route.status === "Blocked"
                                          ? "danger"
                                          : "safe",

                                      route.status || "Open"
                                    )
                                  : ""
                              }

                              <button
                                class="btn btn-secondary"
                                onclick="RescueMap.dispatch('${this.escape(
                                  route.name ||
                                  "Evacuation Route"
                                )}')"
                              >
                                Dispatch
                              </button>

                            </span>

                          </div>
                        `
                      )
                      .join("")
                  : `
                      <p class="muted">
                        No evacuation routes available.
                      </p>
                    `
              }

            </div>

          </section>

          ${
            typeof App.responderBottomNav === "function"
              ? App.responderBottomNav("map")
              : ""
          }

        </div>

      </section>
    `;

    this.init();

    setTimeout(() => {
      if (
        this.map &&
        typeof this.map.invalidateSize === "function"
      ) {
        this.map.invalidateSize();
      }
    }, 120);
  },

  responderRequestCard(request) {
    const priority =
      String(request.priority || "").toLowerCase();

    const status =
      String(request.status || "").toLowerCase();

    const tone =
      priority === "critical"
        ? "danger"
        : status === "pending"
          ? "warning"
          : "info";

    return `
      <div class="mobile-center-item rescue-request-card ${tone}">

        <div>

          <strong>
            ${this.escape(
              request.reporter || "Unknown Resident"
            )}
            -
            ${this.escape(
              request.type || "SOS"
            )}
          </strong>

          <small>
            ${this.escape(
              request.location || "Unknown location"
            )}
            :
            ${this.escape(
              request.note ||
              "No additional information."
            )}
          </small>

          <small>
            Priority:
            ${this.escape(
              request.priority || "High"
            )}
          </small>

        </div>

        <span class="road-actions">

          ${
            typeof App.statusBadge === "function"
              ? App.statusBadge(
                  tone,
                  request.status || "Pending"
                )
              : ""
          }

          ${
            status !== "assigned" &&
            status !== "resolved"
              ? `
                  <button
                    class="btn btn-secondary"
                    onclick="RescueMap.assignRequest('${this.escape(
                      request.id
                    )}')"
                  >
                    Assign
                  </button>
                `
              : ""
          }

          ${
            status !== "resolved"
              ? `
                  <button
                    class="btn btn-primary"
                    onclick="RescueMap.resolveRequest('${this.escape(
                      request.id
                    )}')"
                  >
                    Resolved
                  </button>
                `
              : ""
          }

        </span>

      </div>
    `;
  },

  sideContent(role) {
    if (role === "resident") {
      return `
        ${this.residentRoute()}
        ${this.centersList()}
        ${this.roadStatus(false)}
      `;
    }

    if (role === "responder") {
      return `
        ${this.layerControls()}
        ${this.roadStatus(true)}
        ${this.routesList(true)}
        ${this.centersList()}
      `;
    }

    return `
      ${this.layerControls()}
      ${this.roadStatus(false)}
      ${this.routesList(false)}
      ${this.centersList()}
    `;
  },

  layerControls() {
    return `
      <article class="card card-pad">

        <h3 style="margin-bottom:12px">
          Layer Controls
        </h3>

        <div class="layer-toggle">

          ${[
            "Sensors",
            "Flood Zones",
            "Evacuation Routes",
            "Centers",
            "Rescue Requests"
          ]
            .map(
              (name) => `
                <label class="check">

                  <input
                    type="checkbox"
                    checked
                    onchange="RescueMap.toggle('${name}', this.checked)"
                  >

                  ${this.escape(name)}

                </label>
              `
            )
            .join("")}

        </div>

      </article>
    `;
  },

  residentRoute() {
    const route =
      this.getRoutes()[0];

    const center =
      this.getCenters()[0];

    return `
      <article class="card card-pad recommended-route">

        <span class="badge warning">
          <span class="dot"></span>
          Recommended Route
        </span>

        <h3 style="margin-top:10px">
          ${this.escape(
            this.routeLabel(route)
          )}
        </h3>

        <p
          class="text-2"
          style="margin-top:8px"
        >
          ${this.escape(
            this.routeDescription(route) ||
            "Follow the designated evacuation route."
          )}
        </p>

        ${
          route
            ? `
                <div class="kpi-line">
                  <span>Barangay</span>

                  <strong>
                    ${this.escape(
                      route.barangay ||
                      "Local Area"
                    )}
                  </strong>
                </div>
              `
            : ""
        }

        ${
          center
            ? `
                <div class="kpi-line">

                  <span>Safe Center</span>

                  <strong>
                    ${this.escape(center.name)}
                  </strong>

                </div>
              `
            : ""
        }

        <button
          class="btn btn-primary"
          onclick="App.toast('Route opened in demo map.', 'info')"
        >
          ${App.icons.map}
          Follow Route
        </button>

      </article>
    `;
  },

  roadStatus(actions) {
    const roads =
      this.getRoads();

    return `
      <article class="card card-pad">

        <h3 style="margin-bottom:12px">
          Road Status
        </h3>

        <div class="stack-sm">

          ${
            roads.length
              ? roads
                  .map(
                    (road) => `
                      <div class="kpi-line road-row">

                        <span>

                          <strong>
                            ${this.escape(road.name)}
                          </strong>

                          <br>

                          <span class="muted">
                            ${this.escape(
                              road.note || ""
                            )}
                          </span>

                        </span>

                        <span class="road-actions">

                          ${
                            typeof App.roadBadge === "function"
                              ? App.roadBadge(
                                  road.status ||
                                  "Unknown"
                                )
                              : ""
                          }

                          ${
                            actions
                              ? `
                                  <button
                                    class="btn btn-secondary"
                                    onclick="RescueMap.updateRoad('${this.escape(
                                      road.name
                                    )}')"
                                  >
                                    Update
                                  </button>
                                `
                              : ""
                          }

                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                  <p class="muted">
                    No road status data available.
                  </p>
                `
          }

        </div>

      </article>
    `;
  },

  routesList(actions) {
    const routes =
      this.getRoutes();

    return `
      <article class="card card-pad">

        <h3 style="margin-bottom:12px">
          Evacuation Routes
        </h3>

        <div class="stack-sm">

          ${
            routes.length
              ? routes
                  .map(
                    (route) => `
                      <div class="route-card">

                        <div>

                          <strong>
                            ${this.escape(
                              route.name ||
                              "Evacuation Route"
                            )}
                          </strong>

                          <br>

                          <span class="muted">
                            ${this.escape(
                              route.description ||
                              route.barangay ||
                              ""
                            )}
                          </span>

                        </div>

                        <span class="road-actions">

                          ${
                            typeof App.statusBadge === "function"
                              ? App.statusBadge(
                                  route.status === "Caution"
                                    ? "warning"
                                    : route.status === "Blocked" ||
                                      route.status === "Closed"
                                      ? "danger"
                                      : "safe",

                                  route.status || "Open"
                                )
                              : ""
                          }

                          ${
                            actions
                              ? `
                                  <button
                                    class="btn btn-secondary"
                                    onclick="RescueMap.dispatch('${this.escape(
                                      route.name ||
                                      "Evacuation Route"
                                    )}')"
                                  >
                                    Dispatch
                                  </button>
                                `
                              : ""
                          }

                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                  <p class="muted">
                    No evacuation routes available.
                  </p>
                `
          }

        </div>

      </article>
    `;
  },

  centersList() {
    const centers =
      this.getCenters();

    return `
      <article class="card card-pad">

        <h3 style="margin-bottom:12px">
          Evacuation Centers
        </h3>

        <div class="stack-sm">

          ${
            centers.length
              ? centers
                  .map(
                    (center) => `
                      <div class="kpi-line">

                        <span>

                          <strong>
                            ${this.escape(center.name)}
                          </strong>

                          <br>

                          <span class="muted">

                            ${this.escape(
                              center.barangay || ""
                            )}

                            -

                            Capacity
                            ${Number(center.capacity) || 0}

                            -

                            Occupied
                            ${Number(center.occupied) || 0}

                          </span>

                        </span>

                        ${
                          typeof App.statusBadge === "function"
                            ? App.statusBadge(
                                String(
                                  center.status || ""
                                ).toLowerCase() ===
                                "nearly full"
                                  ? "warning"
                                  : "safe",

                                center.status || "Open"
                              )
                            : ""
                        }

                      </div>
                    `
                  )
                  .join("")
              : `
                  <p class="muted">
                    No evacuation centers available.
                  </p>
                `
          }

        </div>

      </article>
    `;
  },

  /* ---------------------------------------------------------
     Map legend
  --------------------------------------------------------- */

  legendInner() {
    return `
      <h4
        style="
          margin-bottom:8px;
          font-size:0.85rem
        "
      >
        Legend
      </h4>

      <div class="map-legend-list">

        <span>
          <i class="legend-symbol sensor"></i>
          <strong>
            Sensor monitoring point
          </strong>
        </span>

        <span>
          <i class="legend-symbol center"></i>
          <strong>
            Evacuation center
          </strong>
        </span>

        <span>
          <i class="legend-symbol rescue">
            ${App.icons.person}
          </i>
          <strong>
            Needs rescue
          </strong>
        </span>

        <span>
          <i class="legend-symbol responder">
            🚑
          </i>
          <strong>
            Responder
          </strong>
        </span>

        <span>
          <i class="legend-symbol zone"></i>
          <strong>
            Flood-prone / danger area
          </strong>
        </span>

      </div>
    `;
  },

  addLegend() {
    if (!this.map || !window.L) {
      return;
    }

    const legend = L.control({
      position: "bottomright"
    });

    legend.onAdd = () => {
      const div = L.DomUtil.create(
        "div",
        "map-overlay-legend info legend"
      );

      div.innerHTML = this.legendInner();

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      return div;
    };

    legend.addTo(this.map);
  },

  /* ---------------------------------------------------------
     Map initialization
  --------------------------------------------------------- */

  init() {
    const mapElement =
      document.getElementById("rescue-map");

    if (!mapElement) {
      console.error(
        "RESCUE-IOT: #rescue-map element not found."
      );
      return;
    }

    if (!window.L) {
      console.error(
        "RESCUE-IOT: Leaflet failed to load."
      );

      mapElement.innerHTML =
        this.fallbackMap();

      return;
    }

    if (this.map) {
      try {
        this.map.remove();
      } catch (error) {
        console.warn(
          "RESCUE-IOT: unable to remove previous map.",
          error
        );
      }

      this.map = null;
    }

    this.layers = {};

    const mapSeed =
      this.getOpenRequests()
        .concat(this.getResponderLocations())
        .concat(this.getCenters())
        .map(item => this.getCoordinates(item))
        .find(Boolean) ||
      null;

    const marauoyCenter = [13.9644, 121.1657];

    this.map = L.map("rescue-map", {
      zoomControl: true
    }).setView(
      mapSeed || marauoyCenter,
      mapSeed ? 15 : 15
    );

    console.log(
      "RESCUE-IOT: Leaflet map initialized."
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "© OpenStreetMap contributors"
      }
    ).addTo(this.map);

    this.layers.Sensors =
      L.layerGroup().addTo(this.map);

    this.layers.Centers =
      L.layerGroup().addTo(this.map);

    this.layers["Flood Zones"] =
      L.layerGroup().addTo(this.map);

    this.layers["Evacuation Routes"] =
      L.layerGroup().addTo(this.map);

    this.layers["Rescue Requests"] =
      L.layerGroup().addTo(this.map);

    this.layers["Responders"] =
      L.layerGroup().addTo(this.map);

    this.addSensors();
    this.addCenters();
    this.addRescueRequests();
    this.addResponderLocations();
    this.addFloodZones();
    this.addRoutes();

    /* Add map legend */
    this.addLegend();

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  },

  /* ---------------------------------------------------------
     Sensors
  --------------------------------------------------------- */

  addSensors() {
    if (!this.map) {
      return;
    }

    this.getSensors().forEach(
      (sensor) => {
        const coords =
          this.getCoordinates(sensor);

        if (!coords) {
          return;
        }

        const sensorStatus =
          this.getSensorStatus(sensor);

        const level =
          Number(sensor.level) || 0;

        const marker = L.circleMarker(
          coords,
          {
            radius: 9,

            color:
              sensorStatus.color ||
              "#64748b",

            fillColor:
              sensorStatus.color ||
              "#64748b",

            fillOpacity: 0.85,
            weight: 2
          }
        );

        marker.bindPopup(`
          <div class="map-popup">

            <strong>
              ${this.escape(sensor.name)}
            </strong>

            <br>

            <span>
              ${this.escape(sensor.id)}
            </span>

            <hr>

            <strong>
              Water Level:
            </strong>
            ${level} cm

            <br>

            <strong>
              Status:
            </strong>
            ${this.escape(sensorStatus.label)}

            <br>

            <br>

            <strong>
              Barangay:
            </strong>
            ${this.escape(
              sensor.barangay || ""
            )}

          </div>
        `);

        marker.addTo(
          this.layers.Sensors
        );
      }
    );
  },

  /* ---------------------------------------------------------
     Evacuation centers
  --------------------------------------------------------- */

  addCenters() {
    if (!this.map) {
      return;
    }

    this.getCenters().forEach(
      (center) => {
        const coords =
          this.getCoordinates(center);

        if (!coords) {
          return;
        }

        const capacity =
          Number(center.capacity) || 0;

        const occupied =
          Number(center.occupied) || 0;

        const remaining =
          Math.max(
            capacity - occupied,
            0
          );

        const nearlyFull =
          String(
            center.status || ""
          ).toLowerCase() ===
            "nearly full" ||
          (
            capacity > 0 &&
            occupied / capacity >= 0.8
          );

        const color =
          nearlyFull
            ? "#dc2626"
            : "#2563eb";

        L.circleMarker(
          coords,
          {
            radius: 9,
            color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 2
          }
        )
          .bindPopup(`
            <div class="map-popup">

              <strong>
                ${this.escape(center.name)}
              </strong>

              <br>

              ${this.escape(
                center.barangay || ""
              )}

              <hr>

              <strong>
                Capacity:
              </strong>
              ${capacity}

              <br>

              <strong>
                Occupied:
              </strong>
              ${occupied}

              <br>

              <strong>
                Available:
              </strong>
              ${remaining}

              <br>

              <strong>
                Status:
              </strong>
              ${this.escape(
                center.status || "Open"
              )}

              ${
                center.contact
                  ? `
                      <br>

                      <strong>
                        Contact:
                      </strong>

                      ${this.escape(
                        center.contact
                      )}
                    `
                  : ""
              }

            </div>
          `)
          .addTo(
            this.layers.Centers
          );
      }
    );
  },

  /* ---------------------------------------------------------
     Rescue requests
  --------------------------------------------------------- */

  addRescueRequests() {
    if (!this.map) {
      return;
    }

    this.getOpenRequests().forEach(
      (request) => {
        const coords =
          this.getCoordinates(request);

        if (!coords) {
          return;
        }

        const icon =
          this.rescueIcon();

        L.marker(
          coords,
          { icon }
        )
          .bindPopup(`
            <div class="map-popup">

              <strong>
                ${this.escape(
                  request.reporter ||
                  "Resident"
                )}
              </strong>

              <br>

              ${this.escape(
                request.type || "SOS"
              )}

              <hr>

              <strong>
                Status:
              </strong>

              ${this.escape(
                request.status ||
                "Pending"
              )}

              <br>

              <strong>
                Priority:
              </strong>

              ${this.escape(
                request.priority ||
                "High"
              )}

              <br>

              <strong>
                Location:
              </strong>

              ${this.escape(
                request.location ||
                "Unknown"
              )}

              <br>

              ${this.escape(
                request.note || ""
              )}

              ${
                Number.isFinite(
                  Number(request.latitude)
                ) &&
                Number.isFinite(
                  Number(request.longitude)
                )
                  ? `
                    <br><br>
                    <strong>GPS:</strong>
                    ${Number(request.latitude).toFixed(6)},
                    ${Number(request.longitude).toFixed(6)}

                    ${
                      Number.isFinite(
                        Number(request.locationAccuracy)
                      )
                        ? `
                          <br>
                          <strong>Accuracy:</strong>
                          ±${Math.round(
                            Number(
                              request.locationAccuracy
                            )
                          )} m
                        `
                        : ""
                    }

                    <br><br>

                    <a
                      class="btn btn-primary"
                      target="_blank"
                      rel="noopener"
                      href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${request.latitude},${request.longitude}`
                      )}">
                      Navigate to Resident
                    </a>
                  `
                  : `
                    <br><br>
                    <strong>GPS:</strong>
                    Not available
                  `
              }

            </div>
          `)
          .addTo(
            this.layers[
              "Rescue Requests"
            ]
          );
      }
    );
  },

  /* ---------------------------------------------------------
     Responder locations
  --------------------------------------------------------- */

  addResponderLocations() {

    if (
      !this.map ||
      !this.layers.Responders
    ) {
      return;
    }

    const nowMs =
      Date.now();

    this.getResponderLocations().forEach(
      responder => {

        const latitude =
          Number(
            responder.latitude ??
            responder.location?.latitude
          );

        const longitude =
          Number(
            responder.longitude ??
            responder.location?.longitude
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }

        const updated =
          this.toDate(
            responder.updatedAt
          );

        const ageMs =
          updated
            ? nowMs -
              updated.getTime()
            : Infinity;

        const status =
          String(
            responder.status ||
            "Offline"
          ).toLowerCase();

        if (
          status === "offline" ||
          ageMs > 2 * 60 * 1000
        ) {
          return;
        }

        L.marker(
          [latitude, longitude],
          {
            icon:
              this.responderIcon()
          }
        )
          .bindPopup(`
            <div class="map-popup">

              <strong>
                ${this.escape(
                  responder.name ||
                  "Responder"
                )}
              </strong>

              <br>

              <strong>Status:</strong>
              ${this.escape(
                responder.status ||
                "On Duty"
              )}

              <br>

              <strong>GPS:</strong>
              ${latitude.toFixed(6)},
              ${longitude.toFixed(6)}

              ${
                Number.isFinite(
                  Number(
                    responder.accuracy
                  )
                )
                  ? `
                    <br>
                    <strong>Accuracy:</strong>
                    ±${Math.round(
                      Number(
                        responder.accuracy
                      )
                    )} m
                  `
                  : ""
              }

              <br>

              <strong>Updated:</strong>
              ${
                updated
                  ? updated.toLocaleTimeString(
                      "en-PH"
                    )
                  : "Just now"
              }

            </div>
          `)
          .addTo(
            this.layers.Responders
          );

      }
    );

  },

  responderIcon() {

    return L.divIcon({
      className:
        "responder-map-marker",
      html:
        "<span>🚑</span>",
      iconSize:
        [38, 38],
      iconAnchor:
        [19, 19],
      popupAnchor:
        [0, -19]
    });

  },

  toDate(value) {

    if (!value) {
      return null;
    }

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate();
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  },

  startResponderLocationSharing() {

    if (
      !navigator.geolocation ||
      typeof navigator.geolocation.watchPosition !==
        "function"
    ) {
      App.toast(
        "Your browser does not support location sharing.",
        "error"
      );
      return;
    }

    const session =
      this.getSession() || {};

    if (
      this.responderWatchId !==
      null
    ) {
      return;
    }

    const responderId =
      String(
        session.email ||
        session.id ||
        session.name ||
        "responder"
      ).trim();

    this.responderLocationSharing =
      true;

    this.renderResponder();

    this.responderWatchId =
      navigator.geolocation.watchPosition(
        async position => {

          const latitude =
            Number(
              position.coords.latitude
            );

          const longitude =
            Number(
              position.coords.longitude
            );

          const accuracy =
            Number(
              position.coords.accuracy
            );

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return;
          }

          try {

            await RescueData.updateResponderLocation(
              responderId,
              {
                name:
                  session.name ||
                  "Responder",
                email:
                  session.email ||
                  "",
                status:
                  "On Duty",
                latitude,
                longitude,
                accuracy
              }
            );

          } catch (error) {

            console.error(
              "RESCUE-IOT: Unable to save responder location:",
              error
            );

          }

        },

        error => {

          console.error(
            "RESCUE-IOT: Responder location error:",
            error
          );

          this.stopResponderLocationSharing(
            true
          );

          App.toast(
            "Unable to share your location. Please allow location access.",
            "error"
          );

        },

        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000
        }
      );

  },

  async stopResponderLocationSharing(
    silent = false
  ) {

    if (
      this.responderWatchId !==
      null
    ) {

      navigator.geolocation.clearWatch(
        this.responderWatchId
      );

      this.responderWatchId =
        null;

    }

    this.responderLocationSharing =
      false;

    const session =
      this.getSession() || {};

    try {

      const responderId =
        String(
          session.email ||
          session.id ||
          session.name ||
          "responder"
        ).trim();

      await RescueData.updateResponderLocation(
        responderId,
        {
          name:
            session.name ||
            "Responder",
          email:
            session.email ||
            "",
          status:
            "Offline"
        }
      );

    } catch (error) {

      console.warn(
        "RESCUE-IOT: Unable to mark responder offline:",
        error
      );

    }

    if (!silent) {
      App.toast(
        "Location sharing stopped.",
        "success"
      );
    }

    this.renderResponder();

  },

  /* ---------------------------------------------------------
     Flood zones
  --------------------------------------------------------- */

  addFloodZones() {
    if (!this.map || !this.layers["Flood Zones"]) {
      return;
    }

    const zones = this.getFloodZones();

    zones.forEach(zone => {
      const coordinates =
        zone.coordinates ||
        zone.polygon ||
        zone.points;

      if (!Array.isArray(coordinates) || coordinates.length < 3) {
        return;
      }

      const normalized = coordinates
        .map(point => {
          if (Array.isArray(point) && point.length >= 2) {
            return [Number(point[0]), Number(point[1])];
          }

          return [
            Number(point?.latitude),
            Number(point?.longitude)
          ];
        })
        .filter(point =>
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1])
        );

      if (normalized.length < 3) {
        return;
      }

      const color =
        zone.color ||
        (String(zone.status || "").toLowerCase() === "danger"
          ? "#dc2626"
          : "#d97706");

      L.polygon(normalized, {
        color,
        fillColor: color,
        fillOpacity: Number(zone.fillOpacity) || 0.18,
        weight: 2
      })
        .bindPopup(`
          <div class="map-popup">
            <strong>${this.escape(zone.name || "Flood-prone area")}</strong>
            ${zone.description ? `<br>${this.escape(zone.description)}` : ""}
          </div>
        `)
        .addTo(this.layers["Flood Zones"]);
    });
  },

  /* ---------------------------------------------------------
     Evacuation routes
  --------------------------------------------------------- */

  addRoutes() {
    if (!this.map || !this.layers["Evacuation Routes"]) {
      return;
    }

    const routes = this.getRoutes();

    routes.forEach(route => {
      const coordinates =
        route.coordinates ||
        route.path ||
        route.points;

      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return;
      }

      const normalized = coordinates
        .map(point => {
          if (Array.isArray(point) && point.length >= 2) {
            return [Number(point[0]), Number(point[1])];
          }

          return [
            Number(point?.latitude),
            Number(point?.longitude)
          ];
        })
        .filter(point =>
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1])
        );

      if (normalized.length < 2) {
        return;
      }

      L.polyline(normalized, {
        color: route.color || "#2563eb",
        weight: Number(route.weight) || 5,
        dashArray: route.dashArray || "8 8"
      })
        .bindPopup(`
          <div class="map-popup">
            <strong>${this.escape(route.name || "Evacuation route")}</strong>
            ${route.description || route.instruction
              ? `<br>${this.escape(route.description || route.instruction)}`
              : ""}
          </div>
        `)
        .addTo(this.layers["Evacuation Routes"]);
    });
  },

  /* ---------------------------------------------------------
     Rescue marker
  --------------------------------------------------------- */

  rescueIcon() {
    return L.divIcon({
      className:
        "rescue-person-marker",

      html:
        App.icons.person,

      iconSize: [
        34,
        34
      ],

      iconAnchor: [
        17,
        30
      ],

      popupAnchor: [
        0,
        -28
      ]
    });
  },

  /* ---------------------------------------------------------
     Fallback map
  --------------------------------------------------------- */

  fallbackMap() {
    const requests = this.getOpenRequests();
    const centers = this.getCenters();

    return `
      <div class="firebase-map-fallback">
        <div class="firebase-map-fallback-icon">⌖</div>
        <strong>Map data is unavailable</strong>
        <p>
          The map could not be loaded. Firebase rescue data is still available below.
        </p>

        <div class="firebase-map-fallback-grid">
          <div>
            <strong>${requests.length}</strong>
            <span>open rescue requests</span>
          </div>
          <div>
            <strong>${centers.length}</strong>
            <span>evacuation centers</span>
          </div>
        </div>

        ${
          requests.length
            ? `<div class="firebase-map-fallback-list">
                ${requests.slice(0, 5).map(request => `
                  <div>
                    <strong>${this.escape(request.reporter || "Resident")}</strong>
                    <span>${this.escape(request.type || "SOS")}</span>
                    ${
                      Number.isFinite(Number(request.latitude)) &&
                      Number.isFinite(Number(request.longitude))
                        ? `<small>GPS: ${Number(request.latitude).toFixed(5)}, ${Number(request.longitude).toFixed(5)}</small>`
                        : `<small>GPS location unavailable</small>`
                    }
                  </div>
                `).join("")}
              </div>`
            : `<p class="muted">No open rescue requests from Firebase.</p>`
        }
      </div>
    `;
  },

  /* ---------------------------------------------------------
     Layer controls
  --------------------------------------------------------- */

  toggle(name, show) {
    const layer =
      this.layers[name];

    if (
      !layer ||
      !this.map
    ) {
      return;
    }

    if (show) {
      layer.addTo(
        this.map
      );
    } else {
      this.map.removeLayer(
        layer
      );
    }
  },

  /* ---------------------------------------------------------
     Road update
  --------------------------------------------------------- */

  updateRoad(name) {
    /*
     * The current data.js exposes roads as
     * read-only cloned demo data. Therefore,
     * don't pretend this changes persistent data.
     */

    App.showModal(
      "Road Status",

      `
        <p class="text-2">

          Update request for

          <strong>
            ${this.escape(name)}
          </strong>

        </p>

        <label
          class="form-group"
          style="margin-top:12px"
        >

          <span class="form-label">
            New Status
          </span>

          <select
            id="map-road-status"
            class="form-select"
          >
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
          class="btn btn-secondary"
          onclick="App.closeModal()"
        >
          Cancel
        </button>

        <button
          class="btn btn-primary"
          onclick="RescueMap.submitRoadUpdate('${this.escape(
            name
          )}')"
        >
          Submit
        </button>
      `
    );
  },

  submitRoadUpdate(name) {
    const select =
      document.getElementById(
        "map-road-status"
      );

    const status =
      select
        ? select.value
        : "Passable";

    /*
     * Persist only when an update API exists.
     * Otherwise show a demo confirmation.
     */

    if (
      typeof RescueData.updateRoad ===
      "function"
    ) {
      RescueData.updateRoad(
        name,
        status
      );
    }

    App.closeModal();

    App.toast(
      `Road status for ${name} submitted as ${status}.`,
      "success"
    );

    this.render();
  },

  /* ---------------------------------------------------------
     Route dispatch
  --------------------------------------------------------- */

  dispatch(routeName) {
    App.toast(
      `Responder team assigned to ${routeName}.`,
      "success"
    );
  },

  /* ---------------------------------------------------------
     Rescue request assignment
  --------------------------------------------------------- */

  assignRequest(id) {
    let result = null;

    if (
      typeof RescueData.assignRescueRequest ===
      "function"
    ) {
      const session =
        this.getSession() || {};

      result =
        RescueData.assignRescueRequest(
          id,
          session.name ||
          "Responder"
        );
    } else if (
      typeof RescueData.updateRescueRequest ===
      "function"
    ) {
      result =
        RescueData.updateRescueRequest(
          id,
          {
            status: "Assigned",

            assignedTo:
              (
                this.getSession() ||
                {}
              ).name ||
              "Responder",

            assignedAt:
              new Date().toISOString()
          }
        );
    }

    if (!result) {
      App.toast(
        "Unable to assign rescue request.",
        "error"
      );

      return;
    }

    App.toast(
      "Rescue request assigned.",
      "success"
    );

    this.renderResponder();
  },

  /* ---------------------------------------------------------
     Rescue request resolution
  --------------------------------------------------------- */

  resolveRequest(id) {
    let result = null;

    if (
      typeof RescueData.resolveRescueRequest ===
      "function"
    ) {
      result =
        RescueData.resolveRescueRequest(
          id
        );
    } else if (
      typeof RescueData.updateRescueRequest ===
      "function"
    ) {
      result =
        RescueData.updateRescueRequest(
          id,
          {
            status: "Resolved",

            resolvedAt:
              new Date().toISOString()
          }
        );
    }

    if (!result) {
      App.toast(
        "Unable to resolve rescue request.",
        "error"
      );

      return;
    }

    App.toast(
      "Rescue request resolved.",
      "success"
    );

    this.renderResponder();
  }
};

/* -----------------------------------------------------------
   Live Firestore map updates
----------------------------------------------------------- */

window.addEventListener(
  "RescueDataUpdated",
  event => {

    const collection =
      event?.detail?.collection;

    const liveCollections = [
      "rescueRequests",
      "responders",
      "evacuationCenters",
      "routes",
      "floodZones",
      "sensors"
    ];

    if (!liveCollections.includes(collection)) {
      return;
    }

    const session =
      window.RescueMap.getSession();

    if (!session?.loggedIn) {
      return;
    }

    if (
      session.role === "responder" &&
      collection === "rescueRequests"
    ) {
      window.RescueMap.renderResponder();
      return;
    }

    if (
      session.role === "resident" &&
      [
        "rescueRequests",
        "evacuationCenters",
        "routes",
        "floodZones",
        "sensors"
      ].includes(collection)
    ) {
      window.RescueMap.renderResident();
      return;
    }

    if (!window.RescueMap.map) {
      return;
    }

    const layerMap = {
      sensors: ["Sensors", "addSensors"],
      evacuationCenters: ["Centers", "addCenters"],
      routes: ["Evacuation Routes", "addRoutes"],
      floodZones: ["Flood Zones", "addFloodZones"],
      responders: ["Responders", "addResponderLocations"],
      rescueRequests: ["Rescue Requests", "addRescueRequests"]
    };

    const target = layerMap[collection];

    if (
      target &&
      window.RescueMap.layers[target[0]] &&
      typeof window.RescueMap[target[1]] === "function"
    ) {
      window.RescueMap.layers[target[0]].clearLayers();
      window.RescueMap[target[1]]();
    }

  }
);


/* -----------------------------------------------------------
   Start map
----------------------------------------------------------- */

window.RescueMap.render();

