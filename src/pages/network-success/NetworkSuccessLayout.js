import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { apiGet } from "../../api/client";
import { startOfWeek, toISODate, todayInTimezone } from "../../utils/dates";

const TAB_GROUPS = [
  {
    label: "Command",
    tabs: [
      { to: "/network-success", label: "Daily Tracker", end: true },
      { to: "/network-success/dashboard", label: "Network Dashboard", end: false },
      { to: "/network-success/fulfillment", label: "Fulfillment Brain", end: false },
      { to: "/network-success/operational", label: "Operational Analysis", end: false },
    ],
  },
  {
    label: "Reports",
    tabs: [
      { to: "/network-success/reports/eod", label: "End-of-Day Brief", end: false },
      { to: "/network-success/reports/weekly", label: "Weekly Report", end: false },
      { to: "/network-success/reports/provider-checkin", label: "Provider Check-In", end: false },
      { to: "/network-success/reports/provider-performance", label: "Provider Performance", end: false },
    ],
  },
  {
    label: "Analytics",
    tabs: [
      { to: "/network-success/analytics/weekly", label: "Weekly Analytics", end: false },
      { to: "/network-success/analytics/provider-diagnostics", label: "Provider Diagnostics", end: false },
      { to: "/network-success/analytics/monthly", label: "Monthly Analytics", end: false },
    ],
  },
  {
    label: "Admin",
    tabs: [
      { to: "/network-success/settings", label: "Settings", end: false },
      { to: "/network-success/email-templates", label: "Email Templates", end: false },
    ],
  },
];

const tabClasses = ({ isActive }) =>
  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-500 text-white"
      : "bg-white text-slate-600 hover:bg-slate-100"
  }`;

const NetworkSuccessLayout = () => {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  // No division is known yet at mount, so this starts on the default
  // timezone's week — the one-time effect below re-snaps it to the real
  // division's local week as soon as one resolves, without clobbering a
  // date the user has since picked themselves.
  const [weekStart, setWeekStart] = useState(toISODate(startOfWeek(todayInTimezone())));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAdjustedWeekForDivision = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/divisions")
      .then((data) => {
        if (cancelled) return;
        setDivisions(data.divisions);
        const requested = searchParams.get("division");
        const requestedIsValid = requested && data.divisions.some((d) => d._id === requested);
        if (data.divisions.length) {
          setSelectedDivisionId((prev) => prev || (requestedIsValid ? requested : data.divisions[0]._id));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDivision = divisions.find((d) => d._id === selectedDivisionId) || null;

  useEffect(() => {
    if (hasAdjustedWeekForDivision.current || !selectedDivision) return;
    hasAdjustedWeekForDivision.current = true;
    setWeekStart(toISODate(startOfWeek(todayInTimezone(selectedDivision.timezone))));
  }, [selectedDivision]);

  const handleSelectDivision = (id) => {
    setSelectedDivisionId(id);
    setSearchParams({ division: id });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900">Network Success</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Week of
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(toISODate(startOfWeek(e.target.value)))}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          {divisions.length > 0 && (
            <select
              value={selectedDivisionId}
              onChange={(e) => handleSelectDivision(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {divisions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mb-6 space-y-2 border-b border-slate-200 pb-4 print:hidden">
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1">
              {group.tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClasses}>
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading divisions…</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!loading && !error && divisions.length === 0 && (
        <p className="text-sm text-slate-500">
          You don't have access to any divisions yet. Ask an ELT admin to grant you division access.
        </p>
      )}

      {!loading && selectedDivision && (
        <Outlet
          context={{ divisions, selectedDivision, setSelectedDivisionId: handleSelectDivision, weekStart, setWeekStart }}
        />
      )}
    </div>
  );
};

export default NetworkSuccessLayout;
