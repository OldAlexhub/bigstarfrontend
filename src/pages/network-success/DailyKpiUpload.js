import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiDelete, API_BASE } from "../../api/client";
import { toISODate, addDays } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);
const round2 = (v) => (v == null || !Number.isFinite(v) ? "—" : Math.round(v * 100) / 100);

const DailyKpiUpload = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState(null);
  const { begin, isCurrent } = useLatestRequest();

  const [source, setSource] = useState("ecolane");
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [preprocessing, setPreprocessing] = useState(false);
  const [preprocessError, setPreprocessError] = useState("");
  const [previewRows, setPreviewRows] = useState(null);
  const [previewWarnings, setPreviewWarnings] = useState([]);
  const [confirming, setConfirming] = useState(false);

  const weekEnd = toISODate(addDays(weekStart, 6));

  const load = () => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/kpi-entries?division=${selectedDivision._id}&from=${weekStart}&to=${weekEnd}`)
      .then((data) => {
        if (isCurrent(requestId)) setRows(data.rows);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
  };

  useEffect(load, [selectedDivision, weekStart, weekEnd, begin, isCurrent]);

  const handleDelete = async (entryId) => {
    try {
      await apiDelete(`/api/network-success/kpi-entries/${entryId}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePreprocess = async () => {
    if (!selectedDivision || !file1 || (source === "ecolane" && !file2)) return;
    setPreprocessing(true);
    setPreprocessError("");
    setPreviewRows(null);
    setPreviewWarnings([]);
    setAudit(null);
    try {
      const formData = new FormData();
      formData.append("division", selectedDivision._id);
      formData.append("source", source);
      formData.append("file1", file1);
      if (source === "ecolane") formData.append("file2", file2);
      const res = await fetch(`${API_BASE}/api/network-success/kpi-entries/preprocess`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => {
        throw new Error("Could not reach the server — it may still be restarting. Try again in a moment.");
      });
      if (!res.ok) throw new Error(data.message || "Could not preprocess the file(s).");
      setPreviewRows(data.rows.map((r) => ({ ...r, actualHours: String(r.actualHours), totalTrips: String(r.totalTrips), otpPct: String(r.otpPct) })));
      setPreviewWarnings(data.warnings || []);
    } catch (err) {
      setPreprocessError(err.message);
    } finally {
      setPreprocessing(false);
    }
  };

  const updatePreviewRow = (index, field, value) => {
    setPreviewRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removePreviewRow = (index) => {
    setPreviewRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (!selectedDivision || !previewRows || previewRows.length === 0) return;
    setConfirming(true);
    setPreprocessError("");
    try {
      const res = await fetch(`${API_BASE}/api/network-success/kpi-entries/import-confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division: selectedDivision._id, rows: previewRows }),
      });
      const data = await res.json().catch(() => {
        throw new Error("Could not reach the server — it may still be restarting. Try again in a moment.");
      });
      if (!res.ok) {
        throw new Error(data.errors ? data.errors.join("\n") : data.message || "Import failed");
      }
      setAudit(data.audit);
      setPreviewRows(null);
      setPreviewWarnings([]);
      setFile1(null);
      setFile2(null);
      load();
    } catch (err) {
      setPreprocessError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const columns = [
    "Date",
    "Operator",
    "Provider",
    "Route",
    "Scheduled Hrs",
    "Actual Hrs",
    "Fulfillment %",
    "Total Trips",
    "TPSH",
    "OTP %",
    "Route Closures",
    "Late to First",
    "Late Deploy",
    "",
  ];

  return (
    <div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Preprocess a Raw Export</h2>
        <p className="mb-4 text-sm text-slate-500">
          Upload the file(s) straight from your operations system and skip retyping the numbers.
          Vision is one file; Ecolane is the Daily Run Productivity and Driver Performance files
          together, joined by driver. Review the results below before anything is saved.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="report-source"
              value="ecolane"
              checked={source === "ecolane"}
              onChange={() => {
                setSource("ecolane");
                setFile1(null);
                setFile2(null);
              }}
            />
            Ecolane
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="report-source"
              value="vision"
              checked={source === "vision"}
              onChange={() => {
                setSource("vision");
                setFile1(null);
                setFile2(null);
              }}
            />
            Vision
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-4">
          {source === "vision" ? (
            <label className="text-sm text-slate-600">
              Vision Para Operations (.xlsx)
              <input
                type="file"
                accept=".xlsx"
                className="mt-1 block text-sm"
                onChange={(e) => setFile1(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <>
              <label className="text-sm text-slate-600">
                Daily Run Productivity (.xlsx)
                <input
                  type="file"
                  accept=".xlsx"
                  className="mt-1 block text-sm"
                  onChange={(e) => setFile1(e.target.files?.[0] || null)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Driver Performance (.xlsx)
                <input
                  type="file"
                  accept=".xlsx"
                  className="mt-1 block text-sm"
                  onChange={(e) => setFile2(e.target.files?.[0] || null)}
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={handlePreprocess}
            disabled={preprocessing || !file1 || (source === "ecolane" && !file2)}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {preprocessing ? "Processing…" : "Preprocess"}
          </button>
        </div>

        {preprocessError && (
          <pre className="mb-4 whitespace-pre-wrap rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {preprocessError}
          </pre>
        )}

        {audit && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {audit.validRows} row(s) imported: {audit.created} created, {audit.updated} updated.
          </p>
        )}

        {previewWarnings.length > 0 && (
          <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <p className="font-medium">Skipped:</p>
            <ul className="list-inside list-disc">
              {previewWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {previewRows && (
          <div>
            <div className="mb-2 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Date", "Route", "Actual Service Hours", "Total Trips", "OTP %", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                        Nothing to import - every row was skipped. See the warnings above.
                      </td>
                    </tr>
                  )}
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updatePreviewRow(i, "date", e.target.value)}
                          className="w-32 rounded border border-slate-300 px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={row.route}
                          onChange={(e) => updatePreviewRow(i, "route", e.target.value)}
                          className="w-20 rounded border border-slate-300 px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={row.actualHours}
                          onChange={(e) => updatePreviewRow(i, "actualHours", e.target.value)}
                          className="w-20 rounded border border-slate-300 px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={row.totalTrips}
                          onChange={(e) => updatePreviewRow(i, "totalTrips", e.target.value)}
                          className="w-16 rounded border border-slate-300 px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={row.otpPct}
                          onChange={(e) => updatePreviewRow(i, "otpPct", e.target.value)}
                          className="w-16 rounded border border-slate-300 px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => removePreviewRow(i)} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={confirming || previewRows.length === 0}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {confirming ? "Importing…" : `Confirm & Import ${previewRows.length} row(s)`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewRows(null);
                  setPreviewWarnings([]);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <pre className="mb-4 whitespace-pre-wrap rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</pre>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
                  No entries uploaded for this week yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const fulfillment = row.schedHrs > 0 ? row.actualHrs / row.schedHrs : null;
              const tpsh = row.actualHrs > 0 ? row.totalTrips / row.actualHrs : null;
              return (
                <tr key={row.entryId}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.date}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.operator}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.provider}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.routeSource}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{round2(row.schedHrs)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{round2(row.actualHrs)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{pct(fulfillment)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.totalTrips}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{round2(tpsh)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{pct(row.otpPct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.routeClosures}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.lateToFirst}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.lateDeploy}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button onClick={() => handleDelete(row.entryId)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyKpiUpload;
