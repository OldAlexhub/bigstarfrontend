import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPut } from "../../api/client";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

const localMonth = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
};

const monthLabel = (month) => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const inputClasses = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const SafetyScores = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ month: localMonth(), score: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const loadEntries = async (divisionId) => {
    if (!divisionId) return;
    setLoading(true);
    try {
      const data = await apiGet(`/api/safety/scores?division=${encodeURIComponent(divisionId)}`);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet("/api/divisions")
      .then((data) => {
        const available = data.divisions || [];
        setDivisions(available);
        if (available[0]) {
          setDivision(available[0]._id);
          loadEntries(available[0]._id);
        } else setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const average = useMemo(
    () => entries.length ? entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length : null,
    [entries]
  );

  const reset = () => {
    setEditingId(null);
    setForm({ month: localMonth(), score: "" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await apiPut("/api/safety/scores", { division, month: form.month, score: Number(form.score) });
      setMessage(data.created ? "Monthly safety score added." : "Monthly safety score updated.");
      reset();
      await loadEntries(division);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const data = await apiDelete(`/api/safety/scores/${removeTarget.id}`);
      setMessage(data.message);
      if (editingId === removeTarget.id) reset();
      setRemoveTarget(null);
      await loadEntries(division);
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-slate-900">{editingId ? "Update monthly safety score" : "Enter monthly safety score"}</h2>
          <p className="mt-1 text-xs text-slate-500">One score per division and month. The target and scoring direction are controlled in Settings.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">Division
            <select value={division} onChange={(event) => { setDivision(event.target.value); reset(); loadEntries(event.target.value); }} className={inputClasses} required>
              {divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Service month
            <input type="month" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} className={inputClasses} required />
          </label>
          <label className="text-xs font-medium text-slate-600">Safety score
            <input type="number" min="0" step="0.01" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} className={inputClasses} required />
          </label>
          <div className="flex gap-2">
            <button disabled={!division || saving} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving…" : editingId ? "Update" : "Save"}</button>
            {editingId && <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600">Cancel</button>}
          </div>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-semibold text-slate-900">Saved safety scores</h2><p className="text-xs text-slate-500">{entries.length} reported month{entries.length === 1 ? "" : "s"}</p></div>
          <p className="text-xs text-slate-500">Average <strong className="text-slate-900">{average === null ? "—" : average.toFixed(2)}</strong></p>
        </div>
        {loading ? <p className="px-4 py-8 text-center text-sm text-slate-500">Loading safety scores…</p> : entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No safety scores have been entered for this division.</p>
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Service month</th><th className="px-3 py-2">Safety score</th><th className="px-3 py-2">Last updated</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{entries.map((entry) => (
              <tr key={entry.id} className={editingId === entry.id ? "bg-brand-50/40" : ""}>
                <td className="px-4 py-3 font-medium text-slate-900">{monthLabel(entry.month)}</td><td className="px-3 py-3">{entry.score.toFixed(2)}</td><td className="px-3 py-3 text-slate-500">{new Date(entry.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-3"><button type="button" onClick={() => { setEditingId(entry.id); setForm({ month: entry.month, score: String(entry.score) }); }} className="text-xs font-medium text-brand-600">Edit</button><button type="button" onClick={() => { setRemoveTarget(entry); setRemoveError(""); }} className="text-xs font-medium text-red-600">Remove</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <ConfirmDeleteDialog open={Boolean(removeTarget)} title="Remove this safety score?" context={removeTarget ? monthLabel(removeTarget.month) : ""} description="The saved score for this division and month will be permanently removed." busy={removing} error={removeError} onCancel={() => { setRemoveTarget(null); setRemoveError(""); }} onConfirm={remove} />
    </div>
  );
};

export default SafetyScores;
