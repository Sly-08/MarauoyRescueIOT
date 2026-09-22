if (App.initPage("history", "History & Reports", "Historical water levels, logs, summaries, and exports")) {
  window.History = {
    chart: null,
    page: 1,
    rows: [],
    allRows: [],

    dateValue(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },

    getHistory() {
      if (typeof RescueData.history !== "function") return [];
      const data = RescueData.history(168);
      return Array.isArray(data)
        ? data.slice().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        : [];
    },

    applyFilter() {
      const startValue = document.getElementById("history-start")?.value;
      const endValue = document.getElementById("history-end")?.value;

      let start = startValue ? new Date(`${startValue}T00:00:00`) : null;
      let end = endValue ? new Date(`${endValue}T23:59:59.999`) : null;

      if (start && Number.isNaN(start.getTime())) start = null;
      if (end && Number.isNaN(end.getTime())) end = null;

      this.rows = this.allRows.filter(row => {
        const time = new Date(row.time);
        if (Number.isNaN(time.getTime())) return false;
        if (start && time < start) return false;
        if (end && time > end) return false;
        return true;
      }).reverse();

      this.renderTable();
      this.renderChart();
    },

    render() {
      const session = App.getSession();
      const root = document.getElementById("history-root");
      if (!root) return;

      this.allRows = this.getHistory();

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);

      root.innerHTML = `
        <section class="stack history-page">
          <article class="card card-pad history-filter-card">
            <div class="history-filter-head">
              <div>
                <span class="eyebrow">Report Range</span>
                <h3>Water-level history</h3>
                <p class="muted">Review readings received from Firebase.</p>
              </div>
              <span class="history-record-count">${this.allRows.length} records available</span>
            </div>

            <div class="date-row">
              <label class="form-group">
                <span class="form-label">Start Date</span>
                <input id="history-start" class="form-input" type="date" value="${this.dateValue(startDate)}">
              </label>

              <label class="form-group">
                <span class="form-label">End Date</span>
                <input id="history-end" class="form-input" type="date" value="${this.dateValue(today)}">
              </label>

              <button class="btn btn-secondary" type="button" onclick="History.quick('today')">Today</button>
              <button class="btn btn-secondary" type="button" onclick="History.quick('week')">7 Days</button>
              <button class="btn btn-primary" type="button" onclick="History.refresh()">Apply</button>
            </div>
          </article>

          <section class="layout-2">
            <div class="stack">
              <article class="card card-pad">
                <div class="card-header">
                  <div>
                    <h3>${session.role === "admin" ? "Historical Water Level" : "Water-Level Trend"}</h3>
                    <p class="muted">${session.role === "admin" ? "Historical readings and system trends." : "Recent field readings and alert trends."}</p>
                  </div>
                  ${this.reportActions(session.role)}
                </div>
                <div class="chart-box history-chart-box">
                  <canvas id="history-chart"></canvas>
                  <div id="history-chart-empty" class="history-empty" hidden>No readings are available for the selected dates.</div>
                </div>
              </article>

              <article class="card card-pad">
                <div class="card-header">
                  <div>
                    <h3>Reading Log</h3>
                    <p class="muted">${session.role === "admin" ? "Exportable system records" : "Read-only field reference"}</p>
                  </div>
                </div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Water Level</th>
                        <th>Rainfall</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="history-table-body"></tbody>
                  </table>
                </div>
                <div class="pagination">
                  <span id="history-showing"></span>
                  <span>Latest readings first</span>
                </div>
              </article>
            </div>

            <aside class="stack">
              ${this.roleSummary(session.role)}

              <article class="card card-pad">
                <h3 style="margin-bottom:12px">Flood Event Summary</h3>
                <div class="stack-sm">
                  ${(Array.isArray(RescueData.floodEvents) ? RescueData.floodEvents : []).map(event => `
                    <div class="event-card">
                      <strong>${this.escape(event.peak)} cm peak</strong>
                      <p>${this.escape(event.date)} - ${this.escape(event.duration)}</p>
                      <p class="muted">${this.escape(event.areas)}</p>
                      <p class="muted">${this.escape(event.evacuated)} residents evacuated - ${this.escape(event.status)}</p>
                    </div>
                  `).join("")}
                </div>
              </article>

              <article class="card card-pad">
                <h3 style="margin-bottom:12px">Alert History</h3>
                <div class="timeline">
                  ${(Array.isArray(RescueData.alerts) ? RescueData.alerts : []).slice(0, 8).map(alert => `
                    <div class="timeline-item ${this.escape(alert.type)}">
                      <div class="timeline-time">${this.escape(alert.time || alert.createdAt || "")}</div>
                      <div class="timeline-title">${this.escape(alert.level || "Alert")}</div>
                      <div class="timeline-desc">${this.escape(alert.message || "")}</div>
                    </div>
                  `).join("")}
                </div>
              </article>
            </aside>
          </section>
        </section>`;

      this.rows = this.allRows.slice().reverse();
      this.applyFilter();
    },

    renderTable() {
      const body = document.getElementById("history-table-body");
      const showing = document.getElementById("history-showing");
      if (!body || !showing) return;

      const visibleRows = this.rows.slice(0, 20);

      body.innerHTML = visibleRows.length
        ? visibleRows.map(row => {
            const level = Number(row.level ?? row.value ?? row.distance ?? 0);
            const status = RescueData.status(level);
            const rainfall = row.rainfall ?? "—";
            return `
              <tr>
                <td>${this.escape(new Date(row.time).toLocaleString("en-PH"))}</td>
                <td style="color:${this.escape(status.color)};font-weight:900">${this.escape(level)} cm</td>
                <td>${this.escape(rainfall)}${rainfall === "—" ? "" : " mm/hr"}</td>
                <td>${App.statusBadge(status.key, status.label)}</td>
              </tr>`;
          }).join("")
        : `<tr><td colspan="4" class="history-table-empty">No readings found for this date range.</td></tr>`;

      showing.textContent = `Showing ${Math.min(visibleRows.length, this.rows.length)} of ${this.rows.length} records`;
    },

    renderChart() {
      const canvas = document.getElementById("history-chart");
      const empty = document.getElementById("history-chart-empty");
      if (!canvas || typeof RescueCharts?.lineChart !== "function") return;

      if (this.chart && typeof this.chart.destroy === "function") {
        this.chart.destroy();
      }

      this.chart = RescueCharts.lineChart(
        canvas,
        this.rows.slice().reverse(),
        "Historical Water Level (cm)"
      );

      if (empty) {
        empty.hidden = this.rows.length > 0;
      }
    },

    reportActions(role) {
      if (role === "admin") {
        return `<div class="history-actions"><button class="btn btn-secondary" type="button" onclick="History.csv()">${App.icons.download} CSV</button><button class="btn btn-secondary" type="button" onclick="History.pdf()">Print / Save PDF</button><button class="btn btn-secondary" type="button" onclick="window.print()">${App.icons.print} Print</button></div>`;
      }
      return `<div class="history-actions"><button class="btn btn-secondary" type="button" onclick="History.operationNote()">${App.icons.send} Add Field Note</button><button class="btn btn-secondary" type="button" onclick="window.print()">${App.icons.print} Print</button></div>`;
    },

    roleSummary(role) {
      if (role === "admin") {
        return `<article class="card card-pad"><h3 style="margin-bottom:12px">Report Overview</h3><div class="kpi-line"><span>Selected records</span><strong>${this.rows.length}</strong></div><div class="kpi-line"><span>Data source</span><strong>Firebase</strong></div><div class="kpi-line"><span>Exports</span><strong>CSV / Print / PDF</strong></div></article>`;
      }
      return `<article class="card card-pad"><h3 style="margin-bottom:12px">Responder Review</h3><div class="kpi-line"><span>Selected readings</span><strong>${this.rows.length}</strong></div><div class="kpi-line"><span>Focus</span><strong>Water level and alerts</strong></div><div class="kpi-line"><span>Output</span><strong>Print report</strong></div></article>`;
    },

    quick(label) {
      const start = document.getElementById("history-start");
      const end = document.getElementById("history-end");
      const today = new Date();

      if (label === "today") {
        start.value = this.dateValue(today);
        end.value = this.dateValue(today);
      } else {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        start.value = this.dateValue(weekStart);
        end.value = this.dateValue(today);
      }

      this.applyFilter();
    },

    refresh() {
      this.allRows = this.getHistory();
      this.applyFilter();
      App.toast("Report range refreshed.", "success");
    },

    csv() {
      const lines = ["date_time,water_level_cm,rainfall_mm_hr,status"];
      this.rows.forEach(row => {
        const date = new Date(row.time);
        const iso = Number.isNaN(date.getTime()) ? "" : date.toISOString();
        const level = Number(row.level ?? row.value ?? row.distance ?? 0);
        const rainfall = row.rainfall ?? "";
        const status = RescueData.status(level).label;
        lines.push([iso, level, rainfall, status].map(value => `"${String(value).replace(/"/g, '""')}"`).join(","));
      });
      App.downloadText("rescue-iot-history.csv", lines.join("\n"));
    },

    pdf() {
      window.print();
    },

    operationNote() {
      App.showModal(
        "Add Field Note",
        `<label class="form-group"><span class="form-label">Operational Note</span><textarea id="history-note">Responder reviewed the selected water-level trend and confirmed route readiness.</textarea></label>`,
        `<button class="btn btn-secondary" type="button" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" type="button" onclick="App.closeModal();App.toast('Field note saved to incident review.', 'success')">Save</button>`
      );
    },

    escape(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  window.History.render();

  window.addEventListener("RescueDataReady", () => History.render());
  window.addEventListener("RescueDataUpdated", () => History.render());

  if (window.RescueData && typeof RescueData.initialize === "function") {
    RescueData.initialize().catch(error => {
      console.error("RESCUE-IOT: History data initialization failed.", error);
    });
  }
}
