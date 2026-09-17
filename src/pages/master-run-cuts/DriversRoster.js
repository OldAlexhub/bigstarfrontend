import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import { usePagePermission } from "../../components/PageAccessRoute";

const emptyDriver = { name: "", pulloutAddress: "", active: true, division: "" };

const DriversRoster = () => {
  const { divisions, selectedDivision, isAllDivisions } = useOutletContext();
  const { canWrite } = usePagePermission();
  const [drivers, setDrivers] = useState([]);
  const [newDriver, setNewDriver] = useState(emptyDriver);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(emptyDriver);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  const load = () => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    const url = isAllDivisions ? "/api/operators" : `/api/operators?division=${selectedDivision._id}`;
    apiGet(url)
      .then((data) => {
        if (isCurrent(requestId)) setDrivers(data.operators || []);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [selectedDivision, isAllDivisions]);

  useEffect(() => {
    const division = isAllDivisions ? divisions[0]?._id || "" : selectedDivision?._id || "";
    setNewDriver((current) => ({ ...current, division }));
    setEditingId("");
  }, [divisions, selectedDivision, isAllDivisions]);

  const addDriver = async (event) => {
    event.preventDefault();
    if (!canWrite || !newDriver.name.trim() || !newDriver.division) return;
    setSaving(true);
    setError("");
    try {
      const data = await apiPost("/api/operators", newDriver);
      setDrivers((current) => [...current.filter((item) => item._id !== data.operator._id), data.operator]);
      setNewDriver({ ...emptyDriver, division: isAllDivisions ? divisions[0]?._id || "" : selectedDivision._id });
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (driver) => {
    if (!canWrite) return;
    setEditingId(driver._id);
    setDraft({
      name: driver.name || "",
      pulloutAddress: driver.pulloutAddress || "",
      active: driver.active !== false,
      division: driver.division?._id || driver.division || "",
    });
  };

  const saveDriver = async (driver) => {
    if (!canWrite) return;
    setSaving(true);
    setError("");
    try {
      const data = await apiPatch(`/api/operators/${driver._id}`, draft);
      setDrivers((current) => current.map((item) => item._id === driver._id ? data.operator : item));
      setEditingId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeDriver = async (driver) => {
    if (!canWrite) return;
    if (!window.confirm(`Remove ${driver.name} from the Drivers roster?`)) return;
    setError("");
    try {
      const data = await apiDelete(`/api/operators/${driver._id}`);
      setDrivers((current) => data.deactivated
        ? current.map((item) => item._id === driver._id ? { ...item, active: false } : item)
        : current.filter((item) => item._id !== driver._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    const divisionCompare = String(a.division?.code || "").localeCompare(String(b.division?.code || ""));
    return divisionCompare || a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Drivers roster</h2>
          <p className="mt-1 text-sm text-slate-500">Pullout addresses follow drivers into Master Run Cuts and Deployment automatically.</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowAdd((value) => !value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {showAdd ? "Cancel" : "+ Add Driver"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {canWrite && showAdd && (
        <form onSubmit={addDriver} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm text-slate-600">
            Driver name
            <input
              value={newDriver.name}
              onChange={(event) => setNewDriver({ ...newDriver, name: event.target.value })}
              required
              placeholder="First Last"
              className="mt-1 block w-52 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Pullout address
            <input
              value={newDriver.pulloutAddress}
              onChange={(event) => setNewDriver({ ...newDriver, pulloutAddress: event.target.value })}
              className="mt-1 block w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Division
            <select
              value={newDriver.division}
              onChange={(event) => setNewDriver({ ...newDriver, division: event.target.value })}
              required
              disabled={!isAllDivisions}
              className="mt-1 block w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100"
            >
              {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={newDriver.active}
              onChange={(event) => setNewDriver({ ...newDriver, active: event.target.checked })}
            />
            Active
          </label>
          <button type="submit" disabled={saving} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Adding…" : "Add driver"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Driver", "Pullout Address", "Division", "Status", ...(canWrite ? ["Actions"] : [])].map((heading) => (
                <th key={heading} className="px-3 py-2 text-left font-medium text-slate-500">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={canWrite ? 5 : 4} className="px-3 py-6 text-center text-slate-400">Loading drivers…</td></tr>}
            {!loading && sortedDrivers.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="px-3 py-6 text-center text-slate-400">No drivers in this roster yet.</td></tr>}
            {!loading && sortedDrivers.map((driver) => {
              const editing = editingId === driver._id;
              return (
                <tr key={driver._id}>
                  <td className="px-3 py-2">
                    {editing ? <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" /> : <span className="font-medium text-slate-900">{driver.name}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {editing ? <input value={draft.pulloutAddress} onChange={(event) => setDraft({ ...draft, pulloutAddress: event.target.value })} className="w-full min-w-64 rounded-md border border-slate-300 px-2 py-1" /> : driver.pulloutAddress || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {editing && isAllDivisions ? (
                      <select value={draft.division} onChange={(event) => setDraft({ ...draft, division: event.target.value })} className="rounded-md border border-slate-300 bg-white px-2 py-1">
                        {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
                      </select>
                    ) : driver.division?.name || driver.division?.code || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <select value={String(draft.active)} onChange={(event) => setDraft({ ...draft, active: event.target.value === "true" })} className="rounded-md border border-slate-300 bg-white px-2 py-1">
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${driver.active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{driver.active !== false ? "Active" : "Inactive"}</span>
                    )}
                  </td>
                  {canWrite && <td className="whitespace-nowrap px-3 py-2">
                    {editing ? (
                      <><button type="button" onClick={() => saveDriver(driver)} disabled={saving} className="mr-3 text-sm font-medium text-brand-700 hover:underline">Save</button><button type="button" onClick={() => setEditingId("")} className="text-sm text-slate-500 hover:underline">Cancel</button></>
                    ) : (
                      <><button type="button" onClick={() => startEdit(driver)} className="mr-3 text-sm font-medium text-brand-700 hover:underline">Edit</button><button type="button" onClick={() => removeDriver(driver)} className="text-sm font-medium text-red-600 hover:underline">Remove</button></>
                    )}
                  </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriversRoster;
