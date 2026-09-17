const App = {

  icons: {

    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',

    activity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',

    map:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',

    bell:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',

    history:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',

    admin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/><path d="M9 12l2 2 4-5"/></svg>',

    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',

    menu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',

    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',

    person:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',

    water:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a7 7 0 0 0 7-7c0-4-5-8-7-13-2 5-7 9-7 13a7 7 0 0 0 7 7z"/></svg>',

    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',

    signal:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M2 9a15 15 0 0 1 20 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',

    send:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',

    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',

    print:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',

    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',

    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  },

  pages: [

    [
      "dashboard",
      "Dashboard",
      "dashboard.html",
      "dashboard",
      ["admin", "resident", "responder"]
    ],

    [
      "monitoring",
      "Live Monitoring",
      "monitoring.html",
      "activity",
      ["admin", "responder"]
    ],

    [
      "map",
      "Map & Evacuation",
      "map.html",
      "map",
      ["admin", "resident", "responder"]
    ],

    [
      "alerts",
      "Alert Center",
      "alerts.html",
      "bell",
      ["admin", "resident", "responder"]
    ],

    [
      "history",
      "History & Reports",
      "history.html",
      "history",
      ["admin", "responder"]
    ]
  ],


  clockTimer: null,

  escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },


  safeArray(value) {

    return Array.isArray(value)
      ? value
      : [];
  },


  getRescueData() {

    if (
      typeof window !== "undefined" &&
      window.RescueData
    ) {
      return window.RescueData;
    }

    return {};
  },


  getCurrentStatus() {

    const data = this.getRescueData();

    try {

      if (typeof data.status === "function") {
        return data.status();
      }

    } catch (error) {

      console.error(
        "Unable to get current RescueData status:",
        error
      );
    }

    return {
      key: "safe",
      label: "System Normal",
      color: "#2563eb"
    };
  },

  pageLabel(
    id,
    label,
    role = this.getSession().role
  ) {

    if (
      role === "resident" &&
      id === "dashboard"
    ) {
      return "Home";
    }

    if (
      role === "resident" &&
      id === "map"
    ) {
      return "Evacuation Map";
    }

    if (
      role === "resident" &&
      id === "alerts"
    ) {
      return "Alerts";
    }

    if (
      role === "responder" &&
      id === "dashboard"
    ) {
      return "Field Console";
    }

    if (
      role === "responder" &&
      id === "history"
    ) {
      return "Reports";
    }

    return label;
  },


  getRegisteredUsers() {

    try {

      const stored =
        localStorage.getItem(
          "rescue_users"
        );

      if (!stored) {
        return [];
      }

      const users =
        JSON.parse(stored);

      return Array.isArray(users)
        ? users
        : [];

    } catch (error) {

      console.error(
        "Unable to read registered users:",
        error
      );

      return [];
    }
  },


  saveRegisteredUsers(users) {

    try {

      localStorage.setItem(
        "rescue_users",
        JSON.stringify(
          Array.isArray(users)
            ? users
            : []
        )
      );

      return true;

    } catch (error) {

      console.error(
        "Unable to save registered users:",
        error
      );

      return false;
    }
  },


  getUsers() {
    return this.getRegisteredUsers();
  },


  saveUsers(users) {
    return this.saveRegisteredUsers(users);
  },


  findUser(email) {

    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    return this.getRegisteredUsers()
      .find(
        user =>
          String(user.email || "")
            .trim()
            .toLowerCase() ===
          normalizedEmail
      ) || null;
  },

    registerUser(userData = {}) {

    const name =
      String(
        userData.name || ""
      ).trim();

    const email =
      String(
        userData.email || ""
      )
        .trim()
        .toLowerCase();

    const barangay =
      String(
        userData.barangay || ""
      ).trim();

    const phone =
      String(
        userData.phone || ""
      )
        .trim()
        .replace(/[\s-]/g, "");

    const smsEnabled =
      userData.smsEnabled === true;

    const password =
      String(
        userData.password || ""
      );

    if (
      !name ||
      !email ||
      !barangay ||
      !password
    ) {

      return {
        success: false,
        message:
          "Please complete all required fields."
      };
    }

    if (
      !phone ||
      !/^(09\d{9}|639\d{9})$/.test(phone)
    ) {

      return {
        success: false,
        message:
          "Please enter a valid Philippine mobile number."
      };
    }

    if (
      password.length < 8
    ) {

      return {
        success: false,
        message:
          "Password must contain at least 8 characters."
      };
    }

    const users =
      this.getRegisteredUsers();

    const existingUser =
      users.find(
        user =>
          String(
            user.email || ""
          )
            .trim()
            .toLowerCase() ===
          email
      );

    if (existingUser) {

      return {
        success: false,
        message:
          "An account with this email address already exists."
      };
    }

    const user = {

      id:
        "USR-" +
        Date.now(),

      name,

      email,

      barangay,

      phone,

      smsEnabled,

      password,

      role:
        "resident",

      status:
        "active",

      createdAt:
        new Date().toISOString()
    };

    users.push(user);

    if (!this.saveRegisteredUsers(users)) {

  return {
    success: false,
    message:
      "Unable to save the new account."
  };
}

this.syncSmsRecipient(
  user
);

return {
      success: true,
      user,

      message:
        "Account created successfully."
    };
  },

  async syncSmsRecipient(
  user
) {

  if (!user || !user.id) {
    return false;
  }

  const recipient = {
    id:
      user.id,

    name:
      user.name || "",

    email:
      user.email || "",

    barangay:
      user.barangay || "",

    phone:
      user.phone || "",

    smsEnabled:
      user.smsEnabled === true,

    role:
      user.role || "resident",

    status:
      user.status || "active",

    createdAt:
      user.createdAt ||
      new Date().toISOString()
  };

  try {

    const response =
      await fetch(
        "https://rescueiot-default-rtdb.asia-southeast1.firebasedatabase.app/smsRecipients/" +
          encodeURIComponent(
            user.id
          ) +
          ".json",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              recipient
            )
        }
      );

    if (!response.ok) {

      throw new Error(
        `Firebase sync failed: ${response.status}`
      );
    }

    console.log(
      "SMS recipient synced to Firebase:",
      user.id
    );

    return true;

  } catch (error) {

    console.error(
      "Unable to sync SMS recipient to Firebase:",
      error
    );

    return false;
  }
},

  authenticateUser(
    email,
    password,
    role
  ) {

    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    const normalizedRole =
      String(
        role || "resident"
      )
        .trim()
        .toLowerCase();

    const users =
      this.getRegisteredUsers();

    const user =
      users.find(
        item => {

          const itemEmail =
            String(
              item.email || ""
            )
              .trim()
              .toLowerCase();

          const itemPassword =
            String(
              item.password || ""
            );

          const itemRole =
            String(
              item.role || ""
            )
              .trim()
              .toLowerCase();

          const itemStatus =
            String(
              item.status || "active"
            )
              .trim()
              .toLowerCase();

          return (
            itemEmail === normalizedEmail &&
            itemPassword === String(password || "") &&
            itemRole === normalizedRole &&
            itemStatus === "active"
          );
        }
      );

    if (!user) {

      return {
        success: false,
        message:
          "Invalid email, password, or account role."
      };
    }

    this.login(
      user.role,
      user.name,
      user.email,
      user.barangay || ""
    );

    return {
      success: true,
      user,
      message:
        "Login successful."
    };
  },


  authenticate(
    email,
    password,
    role = "resident"
  ) {

    return this.authenticateUser(
      email,
      password,
      role
    );
  },

  getSession() {

    let loggedIn = false;

    try {

      loggedIn =
        localStorage.getItem(
          "rescue_logged_in"
        ) === "true";

    } catch (error) {

      console.error(
        "Unable to read session:",
        error
      );
    }

    const role =
      localStorage.getItem(
        "rescue_role"
      ) || "resident";

    const allowedRoles = [
      "admin",
      "resident",
      "responder"
    ];

    return {

      loggedIn,

      role:
        allowedRoles.includes(role)
          ? role
          : "resident",

      name:
        localStorage.getItem(
          "rescue_name"
        ) || "Public Viewer",

      email:
        localStorage.getItem(
          "rescue_email"
        ) ||
        "public@rescue-iot.ph",

      barangay:
        localStorage.getItem(
          "rescue_barangay"
        ) || ""
    };
  },

  login(
    role,
    name,
    email,
    barangay = ""
  ) {

    const allowedRoles = [
      "admin",
      "resident",
      "responder"
    ];

    const safeRole =
      allowedRoles.includes(
        String(role || "").toLowerCase()
      )
        ? String(role).toLowerCase()
        : "resident";

    localStorage.setItem(
      "rescue_logged_in",
      "true"
    );

    localStorage.setItem(
      "rescue_role",
      safeRole
    );

    localStorage.setItem(
      "rescue_name",
      String(
        name || "User"
      )
    );

    localStorage.setItem(
      "rescue_email",
      String(
        email || ""
      )
        .trim()
        .toLowerCase()
    );

    if (barangay) {

      localStorage.setItem(
        "rescue_barangay",
        String(barangay)
      );

    } else {

      localStorage.removeItem(
        "rescue_barangay"
      );
    }
  },


  publicAccess() {

    this.login(
      "resident",
      "Public Viewer",
      "public@rescue-iot.ph",
      "Marauoy"
    );
  },

  logout() {

    const keys = [
      "rescue_logged_in",
      "rescue_role",
      "rescue_name",
      "rescue_email",
      "rescue_barangay"
    ];

    keys.forEach(
      key =>
        localStorage.removeItem(key)
    );

    if (this.clockTimer) {

      clearInterval(
        this.clockTimer
      );

      this.clockTimer = null;
    }

    window.location.href =
      "index.html";
  },

  initializeDemoUsers() {

    const users =
      this.getRegisteredUsers();

    const demoUsers = [

      {
        id: "ADMIN-001",
        name: "Juan Dela Cruz",
        email: "admin@rescue-iot.ph",
        password: "password123",
        role: "admin",
        barangay: "Marauoy",
        createdAt:
          new Date().toISOString(),
        status: "active"
      },

      {
        id: "RESIDENT-001",
        name: "Maria Santos",
        email: "maria@rescue-iot.ph",
        password: "password123",
        role: "resident",
        barangay: "Marauoy",
        createdAt:
          new Date().toISOString(),
        status: "active"
      },

      {
        id: "RESPONDER-001",
        name: "Pedro Reyes",
        email: "pedro@rescue-iot.ph",
        password: "password123",
        role: "responder",
        barangay: "Marauoy",
        createdAt:
          new Date().toISOString(),
        status: "active"
      }
    ];

    demoUsers.forEach(
      demo => {

        const exists =
          users.some(
            user =>
              String(
                user.email || ""
              )
                .trim()
                .toLowerCase() ===
              demo.email.toLowerCase()
          );

        if (!exists) {

          users.push(demo);

        } else {

        }
      }
    );

    this.saveRegisteredUsers(
      users
    );
  },

  canAccessPage(
    page,
    role = this.getSession().role
  ) {

    const normalizedRole =
      String(
        role || "resident"
      )
        .trim()
        .toLowerCase();

    if (page === "admin") {
      return normalizedRole === "admin";
    }

    const item =
      this.pages.find(
        ([id]) =>
          id === page
      );

    if (!item) {
      return false;
    }

    return item[4].includes(
      normalizedRole
    );
  },

  roleLabel(
    role = this.getSession().role
  ) {

    const labels = {

      admin:
        "System Administrator",

      resident:
        "Resident",

      responder:
        "Emergency Responder"
    };

    return (
      labels[role] ||
      "User"
    );
  },

  initPage(
    page,
    title,
    subtitle
  ) {

    let session =
      this.getSession();

    if (
      !session.loggedIn
    ) {

      this.publicAccess();

      session =
        this.getSession();
    }

    if (
      !this.canAccessPage(
        page,
        session.role
      )
    ) {

      if (
        this.canAccessPage(
          "dashboard",
          session.role
        )
      ) {

        window.location.href =
          "dashboard.html";

      } else {

        window.location.href =
          "index.html";
      }

      return false;
    }

    document.body.classList.toggle(
      "resident-mobile",
      session.role === "resident"
    );

    document.body.classList.toggle(
      "responder-mobile",
      session.role === "responder"
    );

    document.body.classList.toggle(
      "admin-mode",
      session.role === "admin"
    );

    document.body.dataset.role =
      session.role;

    document.body.dataset.page =
      page;

    this.renderSidebar(page);

    this.renderHeader(
      title,
      subtitle
    );

    return true;
  },

  residentTopBar(
    status = this.getCurrentStatus()
  ) {

    return `

      <header class="mobile-app-top">

        <img
          src="assets/May%207,%202026,%2007_38_44%20PM%20(1).png"
          alt="RESCUE-IOT"
        >

        <span class="badge ${this.escapeHTML(status.key)}">

          <span class="dot"></span>

          ${this.escapeHTML(status.label)}

        </span>

      </header>
    `;
  },

  residentBottomNav(
    active = "dashboard"
  ) {

    return `

      <nav class="resident-bottom-nav resident-sos-nav">

        <a
          class="${
            active === "dashboard"
              ? "active"
              : ""
          }"
          href="dashboard.html">

          ${this.icons.shield}

          <span>
            Home
          </span>

        </a>


        <a
          class="${
            active === "map"
              ? "active"
              : ""
          }"
          href="map.html">

          ${this.icons.map}

          <span>
            Map
          </span>

        </a>


        <button
          type="button"
          class="bottom-sos-button"
          onclick="App.openResidentSOS()"
          aria-label="Send SOS">

          <span>
            SOS
          </span>

        </button>


        <a
          class="${
            active === "alerts"
              ? "active"
              : ""
          }"
          href="alerts.html">

          ${this.icons.bell}

          <span>
            Alerts
          </span>

        </a>


        <button
          type="button"
          onclick="App.logout()">

          ${this.icons.logout}

          <span>
            Logout
          </span>

        </button>

      </nav>
    `;
  },

  responderTopBar(
    status = this.getCurrentStatus()
  ) {

    return `

      <header class="mobile-app-top responder-top">

        <div>

          <img
            src="assets/May%207,%202026,%2007_38_44%20PM%20(1).png"
            alt="RESCUE-IOT"
          >

          <span>
            Responder
          </span>

        </div>


        <span class="badge ${this.escapeHTML(status.key)}">

          <span class="dot"></span>

          ${this.escapeHTML(status.label)}

        </span>

      </header>
    `;
  },

  responderBottomNav(
    active = "dashboard"
  ) {

    return `

      <nav class="resident-bottom-nav responder-bottom-nav">

        <a
          class="${
            active === "dashboard"
              ? "active"
              : ""
          }"
          href="dashboard.html">

          ${this.icons.shield}

          <span>
            Field
          </span>

        </a>


        <a
          class="${
            active === "map"
              ? "active"
              : ""
          }"
          href="map.html">

          ${this.icons.map}

          <span>
            Routes
          </span>

        </a>


        <a
          class="${
            active === "alerts"
              ? "active"
              : ""
          }"
          href="alerts.html">

          ${this.icons.bell}

          <span>
            Alerts
          </span>

        </a>


        <a
          class="${
            active === "history"
              ? "active"
              : ""
          }"
          href="history.html">

          ${this.icons.history}

          <span>
            Reports
          </span>

        </a>


        <button
          type="button"
          onclick="App.logout()">

          ${this.icons.logout}

          <span>
            Logout
          </span>

        </button>

      </nav>
    `;
  },

  renderSidebar(
    active
  ) {

    const session =
      this.getSession();

    const nav =
      this.pages.filter(
        ([, , , , roles]) =>
          Array.isArray(roles) &&
          roles.includes(
            session.role
          )
      );

    if (
      session.role === "admin"
    ) {

      nav.push([
        "admin",
        "Admin Panel",
        "admin.html",
        "admin",
        ["admin"]
      ]);
    }

    const safeName =
      String(
        session.name ||
        "User"
      );

    const initials =
      safeName
        .split(" ")
        .filter(Boolean)
        .map(
          part =>
            part[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase() ||
      "U";

    const el =
      document.getElementById(
        "sidebar"
      );

    if (!el) {
      return;
    }

    const navHtml =
      nav
        .map(
          (
            [id, label, href, icon]
          ) => `

            <a
              class="nav-link ${
                id === active
                  ? "active"
                  : ""
              }"
              href="${this.escapeHTML(href)}">

              <span class="nav-icon">

                ${
                  this.icons[
                    icon
                  ] || ""
                }

              </span>

              <span>

                ${this.escapeHTML(
                  this.pageLabel(
                    id,
                    label,
                    session.role
                  )
                )}

              </span>

            </a>
          `
        )
        .join("");

    const currentStatus =
      this.getCurrentStatus();

    const currentWaterLevel =
      Number(
        this.getRescueData()
          .currentWaterLevel || 0
      );

    el.innerHTML = `

      <a
        class="brand"
        href="dashboard.html"
        aria-label="RESCUE-IOT dashboard">

        <img
          src="assets/May%207,%202026,%2007_38_44%20PM%20(1).png"
          alt="RESCUE-IOT">

        <span>

          <span class="brand-title">
            RESCUE-IOT
          </span>

          <span class="brand-subtitle">
            Flood command
          </span>

        </span>

      </a>


      <nav class="sidebar-nav">

        <span class="sidebar-section-label">

          ${
            session.role === "admin"
              ? "Command Center"
              : session.role === "responder"
                ? "Responder Operations"
                : "Resident Services"
          }

        </span>

        ${navHtml}

      </nav>


      <div class="sidebar-footer">

        <div class="sidebar-status">

          <span
            class="sidebar-status-dot ${this.escapeHTML(
              currentStatus.key
            )}">
          </span>

          <div>

            <strong>
              ${this.escapeHTML(
                currentStatus.label
              )}
            </strong>

            <small>
              ${currentWaterLevel} cm water level
            </small>

          </div>

        </div>


        <div class="user-card">

          <div class="avatar">
            ${this.escapeHTML(initials)}
          </div>

          <div>

            <div class="user-name">
              ${this.escapeHTML(
                session.name
              )}
            </div>

            <div class="user-role">
              ${this.escapeHTML(
                this.roleLabel(
                  session.role
                )
              )}
            </div>

          </div>

        </div>


        <button
          type="button"
          class="btn btn-ghost"
          style="width:100%;margin-top:10px"
          onclick="App.logout()">

          ${this.icons.logout}

          Logout

        </button>

      </div>
    `;
  },


  /* =========================================================
     HEADER
     ========================================================= */

  renderHeader(
    title,
    subtitle = ""
  ) {

    const el =
      document.getElementById(
        "top-header"
      );

    if (!el) {
      return;
    }

    const status =
      this.getCurrentStatus();

    const session =
      this.getSession();

    const safeName =
      String(
        session.name ||
        "User"
      );

    const initials =
      safeName
        .split(" ")
        .filter(Boolean)
        .map(
          part =>
            part[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase() ||
      "U";

    const locationText =
      subtitle ||
      (
        this.getRescueData()
          .locationLabel
          ? this.getRescueData()
              .locationLabel()
          : "Flood monitoring system"
      );

    el.innerHTML = `

      <div class="header-left">

        <button
          type="button"
          class="menu-button"
          aria-label="Open menu"
          onclick="App.toggleSidebar()">

          ${this.icons.menu}

        </button>


        <div class="header-title">

          <h2>
            ${this.escapeHTML(
              title || "RESCUE-IOT"
            )}
          </h2>

          <small>
            ${this.escapeHTML(
              locationText
            )}
          </small>

        </div>

      </div>


      <div class="header-search">

        ${this.icons.search}

        <span>
          Search sensors, alerts, routes...
        </span>

      </div>


      <div class="header-right">

        <span class="badge ${this.escapeHTML(
          status.key
        )}">

          <span class="dot"></span>

          ${this.escapeHTML(
            status.label
          )}

        </span>


        <span
          class="clock muted"
          id="header-clock">

          ${new Date().toLocaleTimeString(
            "en-PH"
          )}

        </span>


        <span
          class="header-avatar-mini"
          title="${this.escapeHTML(
            session.name
          )}">

          ${this.escapeHTML(
            initials
          )}

        </span>

      </div>
    `;

    if (this.clockTimer) {

      clearInterval(
        this.clockTimer
      );
    }

    this.clockTimer =
      setInterval(
        () => {

          const clock =
            document.getElementById(
              "header-clock"
            );

          if (clock) {

            clock.textContent =
              new Date()
                .toLocaleTimeString(
                  "en-PH"
                );
          }

        },
        1000
      );
  },


  /* =========================================================
     SIDEBAR TOGGLE
     ========================================================= */

  toggleSidebar() {

    document
      .getElementById("sidebar")
      ?.classList.toggle("open");
  },


  /* =========================================================
     STATUS BADGES
     ========================================================= */

  statusBadge(
    type,
    label
  ) {

    const allowed =
      [
        "safe",
        "warning",
        "danger",
        "critical",
        "info"
      ];

    let key =
      String(
        type || "info"
      ).toLowerCase();

    if (
      key === "critical"
    ) {
      key = "danger";
    }

    if (
      !allowed.includes(key)
    ) {
      key = "info";
    }

    return `

      <span class="badge ${key}">

        <span class="dot"></span>

        ${this.escapeHTML(
          label || key
        )}

      </span>
    `;
  },


  roadBadge(
    status
  ) {

    const normalized =
      String(
        status || ""
      ).trim().toLowerCase();

    const key =
      normalized === "closed"
        ? "danger"
        : normalized === "flooded"
          ? "warning"
          : "safe";

    return this.statusBadge(
      key,
      status || "Open"
    );
  },


  /* =========================================================
     RESIDENT SOS
     ========================================================= */

  openResidentSOS() {

    const session =
      this.getSession();

    const data =
      this.getRescueData();

    let activeRequest = null;

    try {

      if (
        typeof data.requestsByEmail ===
        "function"
      ) {

        activeRequest =
          data
            .requestsByEmail(
              session.email
            )
            .find(
              request =>
                [
                  "Pending",
                  "Assigned",
                  "In Progress"
                ].includes(
                  request.status
                )
            );
      }

    } catch (error) {

      console.error(
        "Unable to check existing emergency requests:",
        error
      );
    }

    if (activeRequest) {

      this.showResidentRequestStatus(
        activeRequest
      );

      return;
    }

    const locations =
      this.safeArray(
        data.requestLocations
      );

    const locationOptions =
      locations.length
        ? locations
            .map(
              location => `

                <option value="${this.escapeHTML(
                  location.name
                )}">

                  ${this.escapeHTML(
                    location.name
                  )}

                </option>
              `
            )
            .join("")
        : `
            <option value="Near my home">
              Near my home
            </option>
          `;

    this.showModal(

      "Request Emergency Assistance",

      `

        <div class="sos-form">

          <div class="sos-warning">

            <strong>
              Emergency assistance
            </strong>

            <p>
              Submit this request only if you
              or someone nearby needs assistance
              from responders.
            </p>

          </div>


          <label class="form-group">

            <span class="form-label">
              Request type
            </span>


            <select
              id="sos-type"
              class="form-input">

              <option value="SOS">
                SOS / Emergency
              </option>

              <option value="Medical">
                Medical assistance
              </option>

              <option value="Flood Report">
                Flood report
              </option>

              <option value="Evacuation Assistance">
                Evacuation assistance
              </option>

            </select>

          </label>


          <label class="form-group">

            <span class="form-label">
              Your location
            </span>


            <select
              id="sos-location"
              class="form-input">

              ${locationOptions}

            </select>

          </label>


          <label class="form-group">

            <span class="form-label">
              Number of people needing assistance
            </span>


            <input
              id="sos-people"
              class="form-input"
              type="number"
              min="1"
              max="50"
              value="1"
              required>

          </label>


          <label class="form-group">

            <span class="form-label">
              Additional information
            </span>


            <textarea
              id="sos-note"
              class="form-input"
              rows="3"
              placeholder="Describe the emergency, injuries, flooding, children, elderly residents, etc."></textarea>

          </label>


          <p
            class="muted"
            style="font-size:.78rem">

            Your name and registered contact
            information will be included with
            the request.

          </p>

        </div>
      `,

      `

        <button
          class="btn btn-secondary"
          type="button"
          onclick="App.closeModal()">

          Cancel

        </button>


        <button
          class="btn btn-danger"
          type="button"
          onclick="App.submitResidentSOS()">

          Send Emergency Request

        </button>
      `
    );
  },


  /* =========================================================
     SUBMIT RESIDENT SOS
     ========================================================= */

  submitResidentSOS() {

    const session =
      this.getSession();

    const data =
      this.getRescueData();

    const type =
      document.getElementById(
        "sos-type"
      )?.value ||
      "SOS";

    const location =
      document.getElementById(
        "sos-location"
      )?.value ||
      "Near my home";

    let people =
      Number(
        document.getElementById(
          "sos-people"
        )?.value || 1
      );

    if (
      !Number.isFinite(people)
    ) {
      people = 1;
    }

    people =
      Math.max(
        1,
        Math.min(
          50,
          Math.round(people)
        )
      );

    const note =
      document.getElementById(
        "sos-note"
      )?.value.trim() ||
      "";

    let activeRequest = null;

    try {

      if (
        typeof data.requestsByEmail ===
        "function"
      ) {

        activeRequest =
          data
            .requestsByEmail(
              session.email
            )
            .find(
              request =>
                [
                  "Pending",
                  "Assigned",
                  "In Progress"
                ].includes(
                  request.status
                )
            );
      }

    } catch (error) {

      console.error(
        "Unable to check existing request:",
        error
      );
    }

    if (activeRequest) {

      this.closeModal();

      this.showResidentRequestStatus(
        activeRequest
      );

      return activeRequest;
    }

    const requestNote =
      [
        `People needing assistance: ${people}`,
        note
      ]
        .filter(Boolean)
        .join(". ");

    if (
      typeof data.addRescueRequest !==
      "function"
    ) {

      this.closeModal();

      this.toast(
        "Emergency request service is unavailable.",
        "danger"
      );

      console.error(
        "RescueData.addRescueRequest() is missing."
      );

      return null;
    }

    let request;

    try {

      request =
        data.addRescueRequest({

          type,

          reporter:
            session.name,

          email:
            session.email,

          contact:
            session.email ===
            "public@rescue-iot.ph"
              ? "Not provided"
              : session.email,

          location,

          note:
            requestNote,

          priority:
            type === "Medical" ||
            type === "SOS"
              ? "Critical"
              : "High"
        });

    } catch (error) {

      console.error(
        "Unable to submit emergency request:",
        error
      );

      this.closeModal();

      this.toast(
        "Unable to submit emergency request.",
        "danger"
      );

      return null;
    }

    this.closeModal();

    if (request?.id) {

      this.toast(
        `Request ${request.id} sent successfully.`,
        "warning"
      );

    } else {

      this.toast(
        "Emergency request submitted.",
        "warning"
      );
    }

    this.refreshComponents();

    return request;
  },


  /* =========================================================
     RESIDENT REQUEST STATUS
     ========================================================= */

  showResidentRequestStatus(
    request
  ) {

    if (!request) {
      return;
    }

    const statusKey =
      request.status === "Resolved"
        ? "safe"
        : request.status === "Pending"
          ? "warning"
          : request.status === "Assigned" ||
            request.status === "In Progress"
            ? "info"
            : "danger";

    const assignedResponder =
      request.assignedTo
        ? `
          <p>
            <strong>
              Responder:
            </strong>
            ${this.escapeHTML(
              request.assignedTo
            )}
          </p>
        `
        : "";

    let statusMessage =
      "This request has been resolved.";

    if (
      request.status ===
      "Pending"
    ) {

      statusMessage =
        "Your request has been received. A responder has not yet been assigned.";

    } else if (
      request.status ===
      "Assigned"
    ) {

      statusMessage =
        "A responder has been assigned to your request. Please remain available and follow official instructions.";

    } else if (
      request.status ===
      "In Progress"
    ) {

      statusMessage =
        "Responders are currently handling your request.";
    }

    this.showModal(

      "Emergency Request",

      `

        <div
          class="resident-request-card ${statusKey}">

          <div
            style="display:flex;justify-content:space-between;gap:10px">

            <strong>
              ${this.escapeHTML(
                request.id || "Emergency Request"
              )}
            </strong>

            ${this.statusBadge(
              statusKey,
              request.status || "Pending"
            )}

          </div>


          <p style="margin-top:10px">

            <strong>
              Type:
            </strong>

            ${this.escapeHTML(
              request.type || "SOS"
            )}

          </p>


          <p>

            <strong>
              Location:
            </strong>

            ${this.escapeHTML(
              request.location || "Unknown"
            )}

          </p>


          <p>

            <strong>
              Submitted:
            </strong>

            ${this.escapeHTML(
              request.time ||
              (
                request.createdAt &&
                typeof this.getRescueData()
                  .formatDateTime === "function"
                  ? this.getRescueData()
                      .formatDateTime(
                        request.createdAt
                      )
                  : request.createdAt ||
                    "Recently"
              )
            )}

          </p>


          <p>

            <strong>
              Details:
            </strong>

            ${this.escapeHTML(
              request.note ||
              "No additional details."
            )}

          </p>


          ${assignedResponder}


          <p style="margin-top:12px">

            ${this.escapeHTML(
              statusMessage
            )}

          </p>

        </div>
      `,

      `

        <button
          class="btn btn-secondary"
          type="button"
          onclick="App.closeModal()">

          Close

        </button>
      `
    );
  },


  /* =========================================================
     SENSOR TABLE
     ========================================================= */

  sensorRows() {

    const data =
      this.getRescueData();

    const sensors =
      this.safeArray(
        data.sensors
      );

    return sensors
      .map(
        sensor => {

          let status = {
            key: "safe",
            label: "Safe",
            color: "#2563eb"
          };

          try {

            if (
              typeof data.status ===
              "function"
            ) {

              status =
                data.status(
                  sensor.lastReading
                );
            }

          } catch (error) {

            console.error(
              "Sensor status error:",
              error
            );
          }

          return `

            <tr>

              <td>

                <strong>
                  ${this.escapeHTML(
                    sensor.id
                  )}
                </strong>

              </td>


              <td>

                ${this.escapeHTML(
                  sensor.name
                )}

                <br>

                <span class="muted">

                  ${this.escapeHTML(
                    sensor.barangay
                  )}

                  -

                  ${this.escapeHTML(
                    sensor.device
                  )}

                </span>

              </td>


              <td
                style="color:${this.escapeHTML(
                  status.color || "#2563eb"
                )};font-weight:900">

                ${this.escapeHTML(
                  sensor.lastReading ?? 0
                )}
                cm

              </td>


              <td>

                ${this.statusBadge(
                  sensor.status === "online"
                    ? "safe"
                    : "warning",
                  sensor.status || "unknown"
                )}

              </td>


              <td>
                ${this.escapeHTML(
                  sensor.battery ?? 0
                )}%
              </td>


              <td>
                ${this.escapeHTML(
                  sensor.signal ?? "--"
                )}
              </td>

            </tr>
          `;
        }
      )
      .join("");
  },


  /* =========================================================
     REFRESH PAGE COMPONENTS
     ========================================================= */

  refreshComponents() {

    const components = [

      [
        "Dashboard",
        window.Dashboard
      ],

      [
        "Alerts",
        window.Alerts
      ],

      [
        "RescueMap",
        window.RescueMap
      ],

      [
        "Monitoring",
        window.Monitoring
      ],

      [
        "Admin",
        window.Admin
      ],

      [
        "History",
        window.History
      ]
    ];

    components.forEach(
      ([name, component]) => {

        try {

          if (
            component &&
            typeof component.render ===
            "function"
          ) {

            component.render();
          }

        } catch (error) {

          console.error(
            `${name} refresh error:`,
            error
          );
        }
      }
    );
  },


  /* =========================================================
     MODAL
     ========================================================= */

  showModal(
    title,
    body,
    actions = ""
  ) {

    let overlay =
      document.querySelector(
        ".modal-overlay"
      );

    if (!overlay) {

      overlay =
        document.createElement(
          "div"
        );

      overlay.className =
        "modal-overlay";

      document.body.appendChild(
        overlay
      );
    }

    const safeTitle =
      this.escapeHTML(
        title || "Dialog"
      );

    overlay.innerHTML = `

      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-label="${safeTitle}">

        <div class="modal-head">

          <h3>
            ${safeTitle}
          </h3>


          <button
            type="button"
            class="btn btn-icon btn-ghost"
            onclick="App.closeModal()"
            aria-label="Close">

            ${this.icons.close}

          </button>

        </div>


        <div>
          ${body || ""}
        </div>


        ${
          actions
            ? `

              <div class="modal-actions">

                ${actions}

              </div>
            `
            : ""
        }

      </section>
    `;

    overlay.classList.add(
      "active"
    );

    overlay.onclick =
      event => {

        if (
          event.target ===
          overlay
        ) {

          this.closeModal();
        }
      };

    /*
     * Allow keyboard users to interact with the modal.
     */
    const firstInput =
      overlay.querySelector(
        "input, select, textarea, button"
      );

    if (firstInput) {

      setTimeout(
        () => firstInput.focus(),
        0
      );
    }
  },


  /* =========================================================
     CLOSE MODAL
     ========================================================= */

  closeModal() {

    const overlay =
      document.querySelector(
        ".modal-overlay"
      );

    if (!overlay) {
      return;
    }

    overlay.classList.remove(
      "active"
    );

    /*
     * Clear contents after the transition.
     * This prevents old forms from remaining active.
     */
    setTimeout(
      () => {

        if (
          !overlay.classList.contains(
            "active"
          )
        ) {

          overlay.innerHTML = "";
        }

      },
      250
    );
  },


  /* =========================================================
     TOAST
     ========================================================= */

  toast(
    message,
    type = "info"
  ) {

    let wrap =
      document.querySelector(
        ".toast-wrap"
      );

    if (!wrap) {

      wrap =
        document.createElement(
          "div"
        );

      wrap.className =
        "toast-wrap";

      document.body.appendChild(
        wrap
      );
    }

    const node =
      document.createElement(
        "div"
      );

    node.className =
      `toast ${type}`;

    node.textContent =
      String(
        message || ""
      );

    wrap.appendChild(
      node
    );

    setTimeout(
      () => {

        node.classList.add(
          "hide"
        );

        setTimeout(
          () => node.remove(),
          250
        );

      },
      3600
    );
  },


  /* =========================================================
     DOWNLOAD TEXT
     ========================================================= */

  downloadText(
    filename,
    content
  ) {

    const blob =
      new Blob(
        [String(content ?? "")],
        {
          type:
            "text/plain;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href =
      url;

    a.download =
      filename ||
      "download.txt";

    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      100
    );
  }
};


/* =========================================================
   MAKE APP AVAILABLE GLOBALLY
   ========================================================= */

window.App =
  App;


/* =========================================================
   INITIALIZE DEMO ACCOUNTS
   ========================================================= */

function initializeRescueApp() {

  try {

    App.initializeDemoUsers();

  } catch (error) {

    console.error(
      "RESCUE-IOT initialization error:",
      error
    );
  }
}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeRescueApp,
    {
      once: true
    }
  );

} else {

  initializeRescueApp();
}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const sidebar =
      document.getElementById(
        "sidebar"
      );

    const button =
      document.querySelector(
        ".menu-button"
      );

    if (
      sidebar?.classList.contains(
        "open"
      ) &&

      !sidebar.contains(
        event.target
      ) &&

      !button?.contains(
        event.target
      )
    ) {

      sidebar.classList.remove(
        "open"
      );
    }
  }
);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      App.closeModal();

      document
        .getElementById(
          "sidebar"
        )
        ?.classList.remove(
          "open"
        );
    }
  }
);


/* =========================================================
   CLEAN UP CLOCK
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      App.clockTimer
    ) {

      clearInterval(
        App.clockTimer
      );

      App.clockTimer = null;
    }
  }
);