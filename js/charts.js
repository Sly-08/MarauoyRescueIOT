const RescueCharts = {
  theme: {
    grid: "rgba(30,41,59,.08)",
    tick: "#7b8798",
    cyan: "#2563eb",
    green: "#2563eb",
    amber: "#dc2626",
    red: "#dc2626"
  },
  thresholdPlugin: {
    id: "rescueThresholds",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      const zones = [
        [0, 50, "rgba(37,99,235,.05)"],
        [50, 80, "rgba(220,38,38,.06)"],
        [80, 130, "rgba(220,38,38,.1)"]
      ];
      ctx.save();
      zones.forEach(([from, to, color]) => {
        const yTop = scales.y.getPixelForValue(to);
        const yBottom = scales.y.getPixelForValue(from);
        ctx.fillStyle = color;
        ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBottom - yTop);
      });
      ctx.restore();
    }
  },
  lineChart(canvas, history, label = "Water Level (cm)") {
    if (!canvas) return null;
    const labels = history.map((point) => RescueData.formatTime(point.time));
    const values = history.map((point) => Number(point.level ?? point.value ?? 0));
    if (!window.Chart) return this.fallbackChart(canvas, labels, values, label, "line");
    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          borderColor: this.theme.cyan,
          backgroundColor: "rgba(37,99,235,.12)",
          fill: true,
          tension: .38,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5
        }]
      },
      plugins: [this.thresholdPlugin],
      options: this.options()
    });
  },
  rainfallChart(canvas, history) {
    if (!canvas) return null;
    const labels = history.map((point) => RescueData.formatTime(point.time));
    const values = history.map((point) => point.rainfall);
    if (!window.Chart) return this.fallbackChart(canvas, labels, values, "Rainfall (mm/hr)", "bar", 24);
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Rainfall (mm/hr)",
          data: values,
          backgroundColor: "rgba(37,99,235,.36)",
          borderColor: "#2563eb",
          borderWidth: 1
        }]
      },
      options: this.options({ max: 24 })
    });
  },
  fallbackChart(canvas, labels, values, label, type = "line", max = 120) {
    const chart = {
      data: { labels: [...labels], datasets: [{ label, data: [...values] }] },
      update: () => this.drawFallback(canvas, chart.data.labels, chart.data.datasets[0].data, label, type, max)
    };
    requestAnimationFrame(chart.update);
    return chart;
  },
  drawFallback(canvas, labels, values, label, type, max) {
    const parent = canvas.parentElement;
    const rect = parent?.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect?.width || canvas.clientWidth || 640));
    const height = Math.max(190, Math.floor(rect?.height || canvas.clientHeight || 260));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    const pad = { top: 34, right: 18, bottom: 34, left: 44 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const yFor = (value) => pad.top + plotH - (Math.max(0, Math.min(max, value)) / max) * plotH;
    const xFor = (index) => pad.left + (values.length <= 1 ? 0 : (index / (values.length - 1)) * plotW);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    if (type === "line") {
      [[0, 50, "rgba(37,99,235,.05)"], [50, 80, "rgba(220,38,38,.06)"], [80, max, "rgba(220,38,38,.1)"]].forEach(([from, to, color]) => {
        ctx.fillStyle = color;
        ctx.fillRect(pad.left, yFor(to), plotW, yFor(from) - yFor(to));
      });
    }

    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.theme.tick;
    ctx.font = "11px Inter, system-ui, sans-serif";
    for (let i = 0; i <= 4; i += 1) {
      const value = Math.round((max / 4) * i);
      const y = yFor(value);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(String(value), 10, y + 4);
    }

    if (type === "bar") {
      const barW = Math.max(3, plotW / Math.max(values.length, 1) - 2);
      values.forEach((value, index) => {
        const x = pad.left + index * (plotW / Math.max(values.length, 1));
        const y = yFor(value);
        ctx.fillStyle = "rgba(37,99,235,.52)";
        ctx.fillRect(x, y, barW, pad.top + plotH - y);
      });
    } else {
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = this.theme.cyan;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = "#475569";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(`${label} - offline renderer`, pad.left, 20);

    const step = Math.max(1, Math.ceil(labels.length / 6));
    labels.forEach((text, index) => {
      if (index % step !== 0) return;
      const x = xFor(index);
      ctx.fillStyle = this.theme.tick;
      ctx.fillText(text, Math.min(x, width - 72), height - 10);
    });
  },
  options(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#475569", boxWidth: 10, usePointStyle: true } },
        tooltip: { backgroundColor: "#111827", borderColor: "rgba(255,255,255,.16)", borderWidth: 1 }
      },
      scales: {
        x: { grid: { color: "rgba(30,41,59,.05)" }, ticks: { color: this.theme.tick, maxTicksLimit: 8 } },
        y: { min: 0, max: extra.max || 120, grid: { color: this.theme.grid }, ticks: { color: this.theme.tick } }
      }
    };
  }
};

window.RescueCharts = RescueCharts;
