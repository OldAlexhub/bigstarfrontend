import { canAccessPage, canAccessSection, firstAccessiblePathForSection, PAGE_ACCESS_PAGES } from "./pageAccess";

export const NAV_ITEMS = [
  { key: "master_run_cuts", label: "Master Run Cuts" },
  { key: "deployment", label: "Deployment" },
  { key: "network_success", label: "Network Success" },
  { key: "customer_service", label: "Customer Service" },
  { key: "safety", label: "Safety" },
  { key: "operations_reporting", label: "Operations Reporting" },
  { key: "elt_reporting", label: "ELT Reporting", pageKey: "elt_reporting.operations_report" },
  { key: "report_builder", label: "Report Builder", pageKey: "report_builder" },
  { key: "leaderboard", label: "Leaderboard", pageKey: "leaderboard" },
];

// Kept as direct top-level navbar links (not grouped into a dropdown). Dashboard.js
// still uses the flat NAV_ITEMS list directly for its quick-link card grid.
export const NAV_FLAT_ITEM_KEYS = ["master_run_cuts", "deployment", "network_success"];

// Groups the rest of NAV_ITEMS for the navbar's dropdown menus.
export const NAV_GROUPS = [
  { key: "performance", label: "Performance", itemKeys: ["safety", "customer_service", "operations_reporting"] },
  { key: "reporting", label: "Reporting", itemKeys: ["elt_reporting", "report_builder", "leaderboard"] },
];

export const canAccess = (user, key) => {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key);
  return item?.pageKey ? canAccessPage(user, item.pageKey) : canAccessSection(user, key);
};

export const accessibleNavItem = (user, item) => {
  if (!canAccess(user, item.key)) return null;
  const path = item.pageKey
    ? PAGE_ACCESS_PAGES.find((page) => page.key === item.pageKey)?.path
    : firstAccessiblePathForSection(user, item.key);
  return path ? { ...item, path } : null;
};
