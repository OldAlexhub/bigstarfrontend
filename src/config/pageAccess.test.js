import {
  canAccessPage,
  effectivePageAccess,
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
