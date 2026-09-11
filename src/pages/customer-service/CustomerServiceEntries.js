import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPut } from "../../api/client";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

const currentMonth = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 7);
};

const monthLabel = (value) =>
  value
    ? new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const CustomerServiceEntries = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ month: currentMonth(), complaints: "0", compliments: "0" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const loadEntries = async (selectedDivision) => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/api/customer-service/entries?division=${encodeURIComponent(selectedDivision)}`);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/divisions")
      .then((data) => {
        if (cancelled) return;
        const available = data.divisions || [];
        setDivisions(available);
        if (available[0]) {
          setDivision(available[0]._id);
          loadEntries(available[0]._id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () =>
      entries.reduce(
        (result, entry) => ({
          complaints: result.complaints + entry.complaints,
          compliments: result.compliments + entry.compliments,
        }),
        { complaints: 0, compliments: 0 }
      ),
    [entries]
  );

  const changeDivision = (value) => {
    setDivision(value);
    setEditingId(null);
    setForm({ month: currentMonth(), complaints: "0", compliments: "0" });
    setMessage("");
    loadEntries(value);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPut("/api/customer-service/entries", {
        division,
        month: form.month,
        complaints: Number(form.complaints),
        compliments: Number(form.compliments),
      });
      setMessage(result.created ? "Monthly counts added." : "Monthly counts updated.");
      setEditingId(null);
      setForm({ month: currentMonth(), complaints: "0", compliments: "0" });
      await loadEntries(division);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (entry) => {
    setEditingId(entry.id);
    setForm({
      month: entry.month,
      complaints: String(entry.complaints),
      compliments: String(entry.compliments),
    });
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ month: currentMonth(), complaints: "0", compliments: "0" });
  };

  const requestRemove = (entry) => {
    setRemoveTarget(entry);
    setRemoveError("");
  };

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setMessage("");
    try {
      const result = await apiDelete(`/api/customer-service/entries/${removeTarget.id}`);
      setMessage(result.message);
      if (editingId === removeTarget.id) cancelEdit();
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{editingId ? "Update monthly counts" : "Enter monthly counts"}</h2>
            <p className="mt-1 text-xs text-slate-500">One saved record per division and month. Saving the same month updates it.</p>
          </div>
          {editingId && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Editing saved entry</span>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">
            Division
            <select value={division} onChange={(event) => changeDivision(event.target.value)} required className={inputClasses}>
              {divisions.map((item) => (
                <option key={item._id} value={item._id}>{item.code} — {item.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Service month
            <input type="month" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} required className={inputClasses} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Complaints
            <input type="number" min="0" step="1" value={form.complaints} onChange={(event) => setForm({ ...form, complaints: event.target.value })} required className={inputClasses} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Compliments
            <input type="number" min="0" step="1" value={form.compliments} onChange={(event) => setForm({ ...form, compliments: event.target.value })} required className={inputClasses} />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={!division || saving} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            )}
          </div>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">Saved monthly counts</h2>
            <p className="text-xs text-slate-500">{entries.length} reported month{entries.length === 1 ? "" : "s"} for this division</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span><strong className="text-red-700">{totals.complaints}</strong> complaints</span>
            <span><strong className="text-emerald-700">{totals.compliments}</strong> compliments</span>
          </div>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Loading monthly counts…</p>
        ) : entries.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No customer service counts yet</p>
            <p className="mt-1 text-xs text-slate-500">Add the first monthly count with the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr><th className="px-4 py-2">Service month</th><th className="px-3 py-2">Complaints</th><th className="px-3 py-2">Compliments</th><th className="px-3 py-2">Last updated</th><th className="px-4 py-2 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className={editingId === entry.id ? "bg-brand-50/40" : ""}>
                    <td className="px-4 py-3 font-medium text-slate-900">{monthLabel(entry.month)}</td>
                    <td className="px-3 py-3 text-slate-700">{entry.complaints.toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-700">{entry.compliments.toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-500">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => edit(entry)} className="text-xs font-medium text-brand-600 hover:underline">Edit</button>
                        <button type="button" onClick={() => requestRemove(entry)} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDeleteDialog
        open={Boolean(removeTarget)}
        title="Remove this customer service record?"
        context={removeTarget ? monthLabel(removeTarget.month) : ""}
        description="The complaint and compliment counts for this division and month will be permanently removed."
        busy={removing}
        error={removeError}
        onCancel={() => {
          setRemoveTarget(null);
          setRemoveError("");
        }}
        onConfirm={remove}
      />
    </div>
  );
};

export default CustomerServiceEntries;
