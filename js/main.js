import "./firebase.js";

await import("./app.js");

if (!window.App) {
  throw new Error(
    "RESCUE-IOT: App failed to load."
  );
}

await import("./data.js");

if (!window.RescueData) {
  throw new Error(
    "RESCUE-IOT: RescueData failed to load."
  );
}

await import("./charts.js");

await import("./dashboard.js");

console.log(
  "RESCUE-IOT application started."
);