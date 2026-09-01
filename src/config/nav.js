export const NAV_ITEMS = [
  { key: "master_run_cuts", label: "Master Run Cuts", path: "/master-run-cuts" },
  { key: "deployment", label: "Deployment", path: "/deployment" },
  { key: "network_success", label: "Network Success", path: "/network-success" },
  { key: "elt_reporting", label: "ELT Reporting", path: "/elt-reporting" },
  { key: "leaderboard", label: "Leaderboard", path: "/leaderboard" },
];

export const canAccess = (user, key) =>
  Boolean(user) && (user.role === "ELT" || user.sections?.includes(key));
