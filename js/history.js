if (App.initPage("history", "History & Reports", "Historical water levels, logs, summaries, and exports")) {
  window.History = {
    chart: null,
    page: 1,
    rows: [],
    render() {
      const session = App.getSession();
      const historyData =
  typeof RescueData.history === "function"
    ? RescueData.history(72)
    : [];

this.rows = Array.isArray(historyData)
  ? historyData.slice(-28).reverse()
  : [];
      document.getElementById("history-root").innerHTML = `
        <section class="stack">
          <article class="card card-pad">
            <div class="date-row">
              <label class="form-group"><span class="form-label">Start Date</span><input class="form-input" type="date" value="2026-05-01"></label>
              <label class="form-group"><span class="form-label">End Date</span><input class="form-input" type="date" value="2026-05-03"></label>
              <button class="btn btn-secondary" onclick="History.quick('today')">Today</button>
              <button class="btn btn-secondary" onclick="History.quick('week')">This Week</button>
              <button class="btn btn-primary" onclick="History.refresh()">Apply</button>
            </div>
          </article>
          <section class="layout-2">
            <div class="stack">
              <article class="card card-pad">
                <div class="card-header"><h3>${session.role === "admin" ? "Historical Water Level Chart" : "Responder Incident Trend"}</h3>${this.reportActions(session.role)}</div>
                <div class="chart-box"><canvas id="history-chart"></canvas></div>
              </article>
              <article class="card card-pad">
                <div class="card-header"><h3>Data Table</h3><span class="muted">${session.role === "admin" ? "Exportable system records" : "Read-only field reference"}</span></div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Date/Time</th><th>Water Level</th><th>Rainfall</th><th>Status</th><th>Alerts Sent</th></tr></thead><tbody>${this.rows.slice(0, 12).map((row, i) => { const status = RescueData.status(row.level); return `<tr><td>${RescueData.formatDateTime(row.time)}</td><td style="color:${status.color};font-weight:900">${row.level} cm</td><td>${row.rainfall} mm/hr</td><td>${App.statusBadge(status.key, status.label)}</td><td>${i % 5 === 0 ? 1 : 0}</td></tr>`; }).join("")}</tbody></table></div>
                <div class="pagination"><span>Showing 12 of ${this.rows.length} records</span><span>Page 1 / 3</span></div>
              </article>
            </div>
            <aside class="stack">
              ${this.roleSummary(session.role)}
              <article class="card card-pad">
                <h3 style="margin-bottom:12px">Flood Event Summary</h3>
                <div class="stack-sm">${(Array.isArray(RescueData.floodEvents) ? RescueData.floodEvents : []).map(event => `<div class="event-card"><strong>${event.peak} cm peak</strong><p>${event.date} - ${event.duration}</p><p class="muted">${event.areas}</p><p class="muted">${event.evacuated} residents evacuated - ${event.status}</p></div>`).join("")}</div>
              </article>
              <article class="card card-pad">
                <h3 style="margin-bottom:12px">Alert History Log</h3>
                <div class="timeline">${(Array.isArray(RescueData.alerts) ? RescueData.alerts : []).map(alert => `<div class="timeline-item ${alert.type}"><div class="timeline-time">${alert.time}</div><div class="timeline-title">${alert.level}</div><div class="timeline-desc">${alert.message}</div></div>`).join("")}</div>
              </article>
            </aside>
          </section>
        </section>`;
      this.chart = RescueCharts.lineChart(document.getElementById("history-chart"), RescueData.history(72), "Historical Water Level (cm)");
    },
    reportActions(role) {
      if (role === "admin") {
        return `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" onclick="History.csv()">${App.icons.download} CSV</button><button class="btn btn-secondary" onclick="History.pdf()">PDF Report</button><button class="btn btn-secondary" onclick="window.print()">${App.icons.print} Print</button></div>`;
      }
      return `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" onclick="History.operationNote()">${App.icons.send} Add Field Note</button><button class="btn btn-secondary" onclick="window.print()">${App.icons.print} Print</button></div>`;
    },
    roleSummary(role) {
      if (role === "admin") {
        return `<article class="card card-pad"><h3 style="margin-bottom:12px">Admin Report Scope</h3><div class="kpi-line"><span>Records</span><strong>${this.rows.length}</strong></div><div class="kpi-line"><span>Exports</span><strong>CSV / PDF / Print</strong></div><div class="kpi-line"><span>Use</span><strong>Thesis evaluation and system audit</strong></div></article>`;
      }
      return `<article class="card card-pad"><h3 style="margin-bottom:12px">Responder Review</h3><div class="kpi-line"><span>Focus</span><strong>Flood peaks and alerts</strong></div><div class="kpi-line"><span>Next Action</span><strong>Check road and center status</strong></div><div class="kpi-line"><span>Exports</span><strong>Print only</strong></div></article>`;
    },
    quick(label) { App.toast(`Date range set to ${label}.`, "info"); },
    refresh() { this.render(); App.toast("Report range refreshed.", "success"); },
    csv() {
      const lines = ["date_time,water_level_cm,rainfall_mm_hr,status"];
      this.rows.forEach((row) => lines.push(`${row.time.toISOString()},${row.level},${row.rainfall},${RescueData.status(row.level).label}`));
      App.downloadText("rescue-iot-history.csv", lines.join("\n"));
    },
    pdf() { App.toast("PDF report export simulated for thesis demo.", "info"); }
    ,
    operationNote() {
      App.showModal("Add Field Note", `<label class="form-group"><span class="form-label">Operational Note</span><textarea>Responder reviewed the recent warning trend and confirmed route readiness.</textarea></label>`, `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.closeModal();App.toast('Field note saved to incident review.', 'success')">Save</button>`);
    }
  };
  window.History.render();
}
