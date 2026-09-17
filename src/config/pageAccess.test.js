import {
  canAccessPage,
  canWritePage,
  effectivePageAccess,
  effectivePageAccessLevels,
  firstAccessiblePathForSection,
} from "./pageAccess";

test("an explicit tab assignment does not grant its sibling tabs", () => {
  const user = {
    role: "Coordinator",
    sections: ["deployment"],
    pageAccessConfigured: true,
    pageAccess: ["deployment.client_report"],
  };

  expect(canAccessPage(user, "deployment.client_report")).toBe(true);
  expect(canAccessPage(user, "deployment.live_schedule")).toBe(false);
  expect(firstAccessiblePathForSection(user, "deployment")).toBe("/deployment/client-report");
});

test("legacy users retain all pages from their assigned sections until edited", () => {
  const pages = effectivePageAccess({ role: "Coordinator", sections: ["customer_service"] });
  expect(pages).toContain("dashboard");
  expect(pages).toContain("customer_service.monthly_counts");
  expect(pages).toContain("customer_service.analytics");
  expect(pages).not.toContain("safety.analytics");
});

test("ELT receives every page automatically", () => {
  expect(canAccessPage({ role: "ELT", pageAccessConfigured: true, pageAccess: [] }, "leaderboard")).toBe(true);
  expect(canAccessPage({ role: "ELT", pageAccessConfigured: true, pageAccess: [] }, "report_builder")).toBe(true);
});

test("Report Builder can be granted independently to a non-ELT user", () => {
  const user = {
    role: "Manager",
    sections: [],
    pageAccessConfigured: true,
    pageAccess: ["report_builder"],
  };

  expect(canAccessPage(user, "report_builder")).toBe(true);
  expect(canAccessPage(user, "elt_reporting.operations_report")).toBe(false);
  expect(canAccessPage(user, "leaderboard")).toBe(false);
});

test("Network Success resource permissions open their nested resource paths", () => {
  const user = {
    role: "Manager",
    pageAccessConfigured: true,
    pageAccess: ["network_success.tui_helper"],
  };

  expect(firstAccessiblePathForSection(user, "network_success"))
    .toBe("/network-success/resources/tui-helper");
});

test("read-only access opens a page without granting write access", () => {
  const user = {
    role: "Manager",
    pageAccessConfigured: true,
    pageAccess: ["network_success.performance", "report_builder"],
    pageAccessLevels: {
      "network_success.performance": "read",
      report_builder: "write",
    },
  };

  expect(canAccessPage(user, "network_success.performance")).toBe(true);
  expect(canWritePage(user, "network_success.performance")).toBe(false);
  expect(canWritePage(user, "report_builder")).toBe(true);
  expect(effectivePageAccessLevels(user)).toEqual({
    "network_success.performance": "read",
    report_builder: "write",
  });
});

test("existing users without saved access levels retain write access", () => {
  expect(canWritePage({ role: "Coordinator", sections: ["safety"] }, "safety.scores")).toBe(true);
  expect(canWritePage({
    role: "Coordinator",
    pageAccessConfigured: true,
    pageAccess: ["safety.scores"],
  }, "safety.scores")).toBe(true);
});
