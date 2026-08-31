import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_ITEMS, canAccess } from "../config/nav";
import { apiGet } from "../api/client";

const StatCard = ({ label, value, tone }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-semibold ${tone || "text-slate-900"}`}>{value}</p>
  </div>
);

// A count-based stat card that expands, on click, into the list of items
// (route/division, issue, or provider) behind the number — so "3 unassigned
// routes" tells you which routes in which divisions instead of just a total.
const ExpandableStatCard = ({ label, tone, items }) => {
  const [open, setOpen] = useState(false);
  const count = items.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => count > 0 && setOpen((v) => !v)}
        className={`block w-full text-left ${count > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-semibold ${tone || "text-slate-900"}`}>{count}</p>
        {count > 0 && (
          <p className="mt-1 text-xs font-medium text-brand-600">{open ? "Hide details ▲" : "Show details ▼"}</p>
        )}
      </button>
      {open && count > 0 && (
        <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto border-t border-slate-100 pt-3 text-sm">
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="text-slate-600 hover:text-brand-700 hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const pct = (v) => `${Math.round((v || 0) * 1000) / 10}%`;

const Dashboard = () => {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => canAccess(user, item.key));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/home-summary")
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flatten = (key, toItem) =>
    (summary?.divisions || []).flatMap((d) => (d[key] || []).map((entry) => toItem(d, entry)));

  const unassignedItems = flatten("unassignedRoutes", (d, r) => ({
    key: `${d.divisionId}-${r.routeId}`,
    label: `${d.name} — Route ${r.routeCode}`,
    to: `/master-run-cuts?division=${d.divisionId}`,
  }));
  const suspendedItems = flatten("suspendedRoutes", (d, r) => ({
    key: `${d.divisionId}-${r.routeId}`,
    label: `${d.name} — Route ${r.routeCode}`,
    to: `/master-run-cuts?division=${d.divisionId}`,
  }));
  const issueItems = flatten("openIssues", (d, i) => ({
    key: `${d.divisionId}-${i.issueId}`,
    label: `${d.name} — ${i.routeCode ? `Route ${i.routeCode}` : "No route"} (${i.disruptionType})`,
    to: `/deployment/issue-log?division=${d.divisionId}`,
  }));
  const providerItems = flatten("belowTargetProviders", (d, p) => ({
    key: `${d.divisionId}-${p.provider}`,
    label: `${d.name} — ${p.provider} (failed ${p.failedKpis.join(", ")})`,
    to: `/network-success/dashboard?division=${d.divisionId}`,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {user?.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening across the network right now.
        </p>
      </div>

      {!loading && summary && (summary.hasOperationsAccess || summary.hasNetworkSuccessAccess) && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summary.hasOperationsAccess && (
              <>
                <StatCard label="Run Cut Fulfillment This Week" value={pct(summary.totals.runCutFulfillmentPct)} />
                <StatCard
                  label="Revenue Hour Fulfillment This Week"
                  value={pct(summary.totals.revenueHourFulfillmentPct)}
                />
                <ExpandableStatCard
                  label="Unassigned Routes"
                  tone={unassignedItems.length > 0 ? "text-amber-600" : "text-slate-900"}
                  items={unassignedItems}
                />
                <ExpandableStatCard
                  label="Routes Suspended Today"
                  tone={suspendedItems.length > 0 ? "text-red-600" : "text-slate-900"}
                  items={suspendedItems}
                />
                <ExpandableStatCard
                  label="Open Issues Today"
                  tone={issueItems.length > 0 ? "text-amber-600" : "text-slate-900"}
                  items={issueItems}
                />
              </>
            )}
            {summary.hasNetworkSuccessAccess && (
              <ExpandableStatCard
                label="Providers Below Target This Week"
                tone={providerItems.length > 0 ? "text-amber-600" : "text-slate-900"}
                items={providerItems}
              />
            )}
          </div>

          {summary.hasOperationsAccess && (
            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Division", "Run Cut Fulfillment", "Revenue Hour Fulfillment", "Unassigned Routes"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.divisions.map((d) => (
                    <tr key={d.divisionId}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        <Link to={`/master-run-cuts?division=${d.divisionId}`} className="hover:underline">
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{pct(d.runCutFulfillmentPct)}</td>
                      <td className="px-3 py-2 text-slate-600">{pct(d.revenueHourFulfillmentPct)}</td>
                      <td className={`px-3 py-2 ${d.unassignedRoutesCount > 0 ? "text-amber-600" : "text-slate-600"}`}>
                        {d.unassignedRoutesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-base font-medium text-slate-900">{item.label}</p>
            <p className="mt-1 text-sm text-slate-500">Open {item.label.toLowerCase()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
