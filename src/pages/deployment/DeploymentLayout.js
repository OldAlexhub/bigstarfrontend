import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { apiGet } from "../../api/client";

const TABS = [
  { to: "/deployment", label: "Live Schedule", end: true },
  { to: "/deployment/issue-log", label: "Issue Log", end: false },
  { to: "/deployment/client-report", label: "Client Report", end: false },
  { to: "/deployment/reporting", label: "Reporting", end: false },
  { to: "/deployment/tracker-log", label: "Tracker Log", end: false },
];

const tabClasses = ({ isActive }) =>
  `border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
    isActive
      ? "border-brand-500 text-brand-700"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
  }`;

const DeploymentLayout = () => {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleSelectDivision = (id) => {
    setSelectedDivisionId(id);
    setSearchParams({ division: id });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Deployment</h1>
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

      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClasses}>
            {tab.label}
          </NavLink>
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
        <Outlet context={{ divisions, selectedDivision, setSelectedDivisionId: handleSelectDivision }} />
      )}
    </div>
  );
};

export default DeploymentLayout;
