import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { TIMEZONES, DEFAULT_TIMEZONE } from "../../utils/dates";

const TABS = [
  { to: "/master-run-cuts", label: "Run Cuts", end: true },
  { to: "/master-run-cuts/tracker", label: "Tracker", end: false },
];

const tabClasses = ({ isActive }) =>
  `border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
    isActive
      ? "border-brand-500 text-brand-700"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
  }`;

const ALL_DIVISIONS_ID = "all";
const ALL_DIVISIONS = { _id: ALL_DIVISIONS_ID, name: "All Divisions", code: "ALL" };

const MasterRunCutsLayout = () => {
  const { user } = useAuth();
  const isELT = user?.role === "ELT";
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivision, setNewDivision] = useState({ code: "", name: "", timezone: DEFAULT_TIMEZONE });
  const [addDivisionError, setAddDivisionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/divisions")
      .then((data) => {
        if (cancelled) return;
        setDivisions(data.divisions);
        const requested = searchParams.get("division");
        const requestedIsValid =
          requested && (requested === ALL_DIVISIONS_ID || data.divisions.some((d) => d._id === requested));
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
    // Only read the ?division= param at the initial mount snapshot — this
    // fetch should run once, not every time the URL's query string changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDivision = (id) => {
    setSelectedDivisionId(id);
    setSearchParams({ division: id });
  };

  const selectedDivision =
    selectedDivisionId === ALL_DIVISIONS_ID
      ? ALL_DIVISIONS
      : divisions.find((d) => d._id === selectedDivisionId) || null;

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.code.trim() || !newDivision.name.trim()) return;
    setAddDivisionError("");
    try {
      const data = await apiPost("/api/divisions", {
        code: newDivision.code.trim().toUpperCase(),
        name: newDivision.name.trim(),
        type: "standard",
        timezone: newDivision.timezone,
      });
      setDivisions((prev) => [...prev, data.division].sort((a, b) => a.code.localeCompare(b.code)));
      handleSelectDivision(data.division._id);
      setNewDivision({ code: "", name: "", timezone: DEFAULT_TIMEZONE });
      setShowAddDivision(false);
    } catch (err) {
      setAddDivisionError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Master Run Cuts</h1>
        <div className="flex items-center gap-2">
          {divisions.length > 0 && (
            <select
              value={selectedDivisionId}
              onChange={(e) => handleSelectDivision(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={ALL_DIVISIONS_ID}>All Divisions</option>
              {divisions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          {isELT && (
            <button
              type="button"
              onClick={() => setShowAddDivision((v) => !v)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              + New Division
            </button>
          )}
        </div>
      </div>

      {showAddDivision && (
        <form onSubmit={handleAddDivision} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          {addDivisionError && (
            <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{addDivisionError}</p>
          )}
          <label className="text-sm text-slate-600">
            Code
            <input
              value={newDivision.code}
              onChange={(e) => setNewDivision({ ...newDivision, code: e.target.value })}
              placeholder="DIV_12"
              required
              className="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm text-slate-600">
            Name
            <input
              value={newDivision.name}
              onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
              placeholder="Division 12 - Example"
              required
              className="mt-1 block w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm text-slate-600">
            Timezone
            <select
              value={newDivision.timezone}
              onChange={(e) => setNewDivision({ ...newDivision, timezone: e.target.value })}
              className="mt-1 block w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Create division
          </button>
        </form>
      )}

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
        <Outlet
          context={{
            divisions,
            selectedDivision,
            setSelectedDivisionId: handleSelectDivision,
            isAllDivisions: selectedDivisionId === ALL_DIVISIONS_ID,
          }}
        />
      )}
    </div>
  );
};

export default MasterRunCutsLayout;
