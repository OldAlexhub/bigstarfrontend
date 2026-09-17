import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import { usePagePermission } from "../../components/PageAccessRoute";

const VehiclesRoster = () => {
  const { divisions, selectedDivision, isAllDivisions } = useOutletContext();
  const { canWrite } = usePagePermission();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ code: "", division: "" });
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ code: "", division: "" });
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
    const url = isAllDivisions ? "/api/vehicles?active=1" : `/api/vehicles?division=${selectedDivision._id}&active=1`;
    apiGet(url)
      .then((data) => {
        if (isCurrent(requestId)) setVehicles(data.vehicles || []);
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
    setForm({ code: "", division: isAllDivisions ? divisions[0]?._id || "" : selectedDivision?._id || "" });
    setEditingId("");
  }, [divisions, selectedDivision, isAllDivisions]);

  const addVehicle = async (event) => {
    event.preventDefault();
    if (!canWrite || !form.code.trim() || !form.division) return;
    setSaving(true);
    setError("");
    try {
      const data = await apiPost("/api/vehicles", form);
      setVehicles((current) => [...current.filter((item) => item._id !== data.vehicle._id), data.vehicle]);
      setForm({ code: "", division: isAllDivisions ? divisions[0]?._id || "" : selectedDivision._id });
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async (vehicle) => {
    if (!canWrite) return;
    setSaving(true);
    setError("");
    try {
      const data = await apiPatch(`/api/vehicles/${vehicle._id}`, draft);
      setVehicles((current) => current.map((item) => item._id === vehicle._id ? data.vehicle : item));
      setEditingId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeVehicle = async (vehicle) => {
    if (!canWrite) return;
    if (!window.confirm(`Remove vehicle ${vehicle.code} from the roster?`)) return;
    setError("");
    try {
      await apiDelete(`/api/vehicles/${vehicle._id}`);
      setVehicles((current) => current.filter((item) => item._id !== vehicle._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const divisionCompare = String(a.division?.code || "").localeCompare(String(b.division?.code || ""));
    return divisionCompare || a.code.localeCompare(b.code, undefined, { numeric: true });
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Vehicles roster</h2>
          <p className="mt-1 text-sm text-slate-500">Only vehicles in the selected division appear in assignment lists.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setShowAdd((value) => !value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            {showAdd ? "Cancel" : "+ Add Vehicle"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {canWrite && showAdd && (
        <form onSubmit={addVehicle} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm text-slate-600">
            Vehicle number
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required className="mt-1 block w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            Division
            <select value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value })} required disabled={!isAllDivisions} className="mt-1 block w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100">
              {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={saving} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Adding…" : "Add vehicle"}</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr>{["Vehicle Number", "Division", ...(canWrite ? ["Actions"] : [])].map((heading) => <th key={heading} className="px-3 py-2 text-left font-medium text-slate-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={canWrite ? 3 : 2} className="px-3 py-6 text-center text-slate-400">Loading vehicles…</td></tr>}
            {!loading && sortedVehicles.length === 0 && <tr><td colSpan={canWrite ? 3 : 2} className="px-3 py-6 text-center text-slate-400">No vehicles in this roster yet.</td></tr>}
            {!loading && sortedVehicles.map((vehicle) => {
              const editing = editingId === vehicle._id;
              return (
                <tr key={vehicle._id}>
                  <td className="px-3 py-2">{editing ? <input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} className="rounded-md border border-slate-300 px-2 py-1" /> : <span className="font-medium text-slate-900">{vehicle.code}</span>}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {editing && isAllDivisions ? <select value={draft.division} onChange={(event) => setDraft({ ...draft, division: event.target.value })} className="rounded-md border border-slate-300 bg-white px-2 py-1">{divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}</select> : vehicle.division?.name || vehicle.division?.code || "—"}
                  </td>
                  {canWrite && <td className="whitespace-nowrap px-3 py-2">
                    {editing ? <><button type="button" onClick={() => saveVehicle(vehicle)} disabled={saving} className="mr-3 text-sm font-medium text-brand-700 hover:underline">Save</button><button type="button" onClick={() => setEditingId("")} className="text-sm text-slate-500 hover:underline">Cancel</button></> : <><button type="button" onClick={() => { setEditingId(vehicle._id); setDraft({ code: vehicle.code, division: vehicle.division?._id || vehicle.division }); }} className="mr-3 text-sm font-medium text-brand-700 hover:underline">Edit</button><button type="button" onClick={() => removeVehicle(vehicle)} className="text-sm font-medium text-red-600 hover:underline">Remove</button></>}
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

export default VehiclesRoster;
