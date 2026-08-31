import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";

const DAY_LABELS = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

const ClientReport = () => {
  const { selectedDivision } = useOutletContext();
  const [which, setWhich] = useState("today");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const reportRef = useRef(null);

  const today = todayInTimezone(selectedDivision?.timezone);
  const targetDate = which === "today" ? today : addDays(today, 1);
  const dateStr = toISODate(targetDate);

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/reports/daily-schedule?division=${selectedDivision._id}&date=${dateStr}`)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, dateStr]);

  const handleCopy = async () => {
    setCopyStatus("");
    if (!reportRef.current) return;
    try {
      const html = reportRef.current.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([reportRef.current.innerText], { type: "text/plain" });
      await navigator.clipboard.write([
        new window.ClipboardItem({ "text/html": blob, "text/plain": textBlob }),
      ]);
      setCopyStatus("Copied — paste into your email.");
    } catch (err) {
      setCopyStatus("Couldn't copy automatically — select the table below and copy manually.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1">
          {[
            { key: "today", label: "Today" },
            { key: "tomorrow", label: "Tomorrow" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setWhich(opt.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                which === opt.key ? "bg-brand-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={loading || !report?.rows?.length}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          Copy report
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {copyStatus && <p className="mb-4 text-sm text-slate-500">{copyStatus}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && report && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div ref={reportRef} style={{ fontFamily: "Calibri, Arial, sans-serif", color: "#1e293b" }}>
            <p>Hi Team,</p>
            <p>
              Please find the Daily Schedule &amp; Changes for ({DAY_LABELS[report.dayOfWeek]}), ({dateStr}) below.
            </p>
            <p>
              Any changes from the original Work Order (WO), as well as any discrepancies identified, are
              documented in detail within the <strong>Client Notes</strong> column for reference.
            </p>
            <p>Please review and reach out with any questions.</p>
            <table cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#29b6d8", color: "#ffffff" }}>
                  {["Division", "Day", "Date", "Assignment/Route", "Operator", "Veh", "Pullout", "Start", "End", "Client Notes"].map(
                    (h) => (
                      <th key={h} style={{ border: "1px solid #94a3b8", textAlign: "left" }}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ border: "1px solid #94a3b8", textAlign: "center" }}>
                      No routes scheduled.
                    </td>
                  </tr>
                )}
                {report.rows.map((row, i) => {
                  const notDeploying = row.status !== "active";
                  const rowStyle = notDeploying
                    ? { backgroundColor: "#fecaca", color: "#7f1d1d", fontWeight: "bold" }
                    : { backgroundColor: i % 2 ? "#f1f5f9" : "#ffffff" };
                  return (
                    <tr key={i} style={rowStyle}>
                      <td style={{ border: "1px solid #cbd5e1" }}>{report.division.code}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{report.dayOfWeek}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{dateStr}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.route}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.operator}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.vehicle}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.pulloutAddress}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.startTime}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.endTime}</td>
                      <td style={{ border: "1px solid #cbd5e1" }}>{row.clientNotes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: 16 }}>Thank you,</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReport;
