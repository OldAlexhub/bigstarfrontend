export const NAV_ITEMS = [
  { key: "master_run_cuts", label: "Master Run Cuts", path: "/master-run-cuts" },
  { key: "deployment", label: "Deployment", path: "/deployment" },
  { key: "network_success", label: "Network Success", path: "/network-success" },
  { key: "customer_service", label: "Customer Service", path: "/customer-service" },
  { key: "safety", label: "Safety", path: "/safety" },
  { key: "operations_reporting", label: "Operations Reporting", path: "/operations-reporting" },
  { key: "elt_reporting", label: "ELT Reporting", path: "/elt-reporting" },
  { key: "leaderboard", label: "Leaderboard", path: "/leaderboard" },
];

// Kept as direct top-level navbar links (not grouped into a dropdown). Dashboard.js
// still uses the flat NAV_ITEMS list directly for its quick-link card grid.
export const NAV_FLAT_ITEM_KEYS = ["master_run_cuts", "deployment", "network_success"];

// Groups the rest of NAV_ITEMS for the navbar's dropdown menus.
export const NAV_GROUPS = [
  { key: "performance", label: "Performance", itemKeys: ["safety", "customer_service", "operations_reporting"] },
  { key: "reporting", label: "Reporting", itemKeys: ["elt_reporting", "leaderboard"] },
];

export const canAccess = (user, key) =>
  Boolean(user) && (user.role === "ELT" || user.sections?.includes(key));
