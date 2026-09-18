export const PAGE_ACCESS_GROUPS = [
  {
    key: "general",
    label: "General",
    pages: [
      { key: "dashboard", label: "Dashboard", path: "/dashboard" },
      { key: "settings.general", label: "Settings", path: "/settings" },
    ],
  },
  {
    key: "master_run_cuts",
    label: "Master Run Cuts",
    pages: [
      { key: "master_run_cuts.run_cuts", label: "Run Cuts", path: "/master-run-cuts" },
      { key: "master_run_cuts.drivers", label: "Drivers", path: "/master-run-cuts/drivers" },
      { key: "master_run_cuts.vehicles", label: "Vehicles", path: "/master-run-cuts/vehicles" },
      { key: "master_run_cuts.tracker", label: "Tracker", path: "/master-run-cuts/tracker" },
    ],
  },
  {
    key: "deployment",
    label: "Deployment",
    pages: [
      { key: "deployment.live_schedule", label: "Live Schedule", path: "/deployment" },
      { key: "deployment.permanent_osr", label: "Permanent OSR", path: "/deployment/permanent-osr" },
      { key: "deployment.standby_utilization", label: "STBY Utilization", path: "/deployment/standby-utilization" },
      { key: "deployment.issue_log", label: "Issue Log", path: "/deployment/issue-log" },
      { key: "deployment.client_report", label: "Client Report", path: "/deployment/client-report" },
      { key: "deployment.reporting", label: "Reporting", path: "/deployment/reporting" },
      { key: "deployment.schedule_history", label: "Schedule History", path: "/deployment/schedule-history" },
      { key: "deployment.receiving_requests", label: "Receiving Requests", path: "/deployment/receiving-requests" },
      { key: "deployment.posts", label: "Posts", path: "/deployment/posts" },
      { key: "deployment.tracker_log", label: "Tracker Log", path: "/deployment/tracker-log" },
    ],
  },
  {
    key: "network_success",
    label: "Network Success",
    pages: [
      { key: "network_success.excel_submissions", label: "Excel Submissions", path: "/network-success" },
      { key: "network_success.performance", label: "Performance", path: "/network-success/performance" },
      { key: "network_success.reallocation_requests", label: "Reallocation Requests", path: "/network-success/reallocation-requests" },
      { key: "network_success.posts", label: "Posts", path: "/network-success/posts" },
      { key: "network_success.email_templates", label: "Email Templates", path: "/network-success/resources/email-templates" },
      { key: "network_success.ld_helper", label: "LD Helper", path: "/network-success/resources/ld-helper" },
      { key: "network_success.tui_helper", label: "TUI Helper", path: "/network-success/resources/tui-helper" },
    ],
  },
  {
    key: "customer_service",
    label: "Customer Service",
    pages: [
      { key: "customer_service.monthly_counts", label: "Monthly Counts", path: "/customer-service" },
      { key: "customer_service.analytics", label: "Analytics", path: "/customer-service/analytics" },
    ],
  },
  {
    key: "safety",
    label: "Safety",
    pages: [
      { key: "safety.accidents", label: "Accidents", path: "/safety" },
      { key: "safety.scores", label: "Safety Scores", path: "/safety/scores" },
      { key: "safety.analytics", label: "Analytics", path: "/safety/analytics" },
    ],
  },
  {
    key: "operations_reporting",
    label: "Operations Reporting",
    pages: [
      { key: "operations_reporting.kpi_tracker", label: "12 Month KPI Tracker", path: "/operations-reporting" },
      { key: "operations_reporting.monthly_dashboard", label: "Monthly KPI Snapshot", path: "/operations-reporting/dashboard" },
      { key: "operations_reporting.cap", label: "CAP", path: "/operations-reporting/cap" },
      { key: "operations_reporting.cap_reporting", label: "CAP Reporting", path: "/operations-reporting/cap-reporting" },
    ],
  },
  {
    key: "executive_reporting",
    label: "Executive Reporting",
    pages: [
      { key: "elt_reporting.operations_report", label: "Operations Report", path: "/elt-reporting" },
      {
        key: "report_builder",
        label: "Report Builder & Exports",
        path: "/report-builder",
        description: "Build, preview, save, and export company-wide reports.",
      },
      { key: "leaderboard", label: "Leaderboard", path: "/leaderboard" },
    ],
  },
];

export const PAGE_ACCESS_PAGES = PAGE_ACCESS_GROUPS.flatMap((group) => group.pages);
export const PAGE_ACCESS_KEYS = PAGE_ACCESS_PAGES.map((page) => page.key);
export const PAGE_ACCESS_LEVELS = ["read", "write"];

const sectionForPage = (page) => {
  const section = String(page || "").split(".")[0];
  return [
    "master_run_cuts",
    "deployment",
    "network_success",
    "customer_service",
    "safety",
    "operations_reporting",
  ].includes(section)
    ? section
    : null;
};

export const canAccessPage = (user, page) => {
  if (!user) return false;
  if (user.role === "ELT") return true;
  if (user.pageAccessConfigured) return (user.pageAccess || []).includes(page);

  if (page === "dashboard") return true;
  if (page === "settings.general") {
    return (user.sections || []).some((section) => ["master_run_cuts", "deployment"].includes(section));
  }
  const section = sectionForPage(page);
  return Boolean(section && (user.sections || []).includes(section));
};

export const pageAccessLevel = (user, page) => {
  if (!canAccessPage(user, page)) return null;
  if (user.role === "ELT" || !user.pageAccessConfigured) return "write";
  return user.pageAccessLevels?.[page] === "read" ? "read" : "write";
};

export const canWritePage = (user, page) => pageAccessLevel(user, page) === "write";

export const effectivePageAccess = (user) =>
  PAGE_ACCESS_KEYS.filter((page) => canAccessPage(user, page));

export const effectivePageAccessLevels = (user) => Object.fromEntries(
  effectivePageAccess(user).map((page) => [page, pageAccessLevel(user, page)])
);

export const firstAccessiblePath = (user, fallback = "/access-denied") =>
  PAGE_ACCESS_PAGES.find((page) => canAccessPage(user, page))?.path || fallback;

export const pagesForSection = (section) =>
  PAGE_ACCESS_GROUPS.find((group) => group.key === section)?.pages || [];

export const canAccessSection = (user, section) =>
  pagesForSection(section).some((page) => canAccessPage(user, page.key));

export const firstAccessiblePathForSection = (user, section) =>
  pagesForSection(section).find((page) => canAccessPage(user, page.key))?.path;
