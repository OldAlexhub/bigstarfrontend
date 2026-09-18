import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiDownload } from "../../api/client";
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

const UPDATE_WORDING = {
  today: "a live day schedule update",
  tomorrow: "an update to tomorrow's schedule",
};

const cellStyle = { border: "1px solid #94a3b8", padding: 6 };
const headerStyle = {
  ...cellStyle,
  backgroundColor: "#16b5e5",
  color: "#111827",
  fontWeight: 700,
  textAlign: "center",
};

const formatEmailDate = (isoDate) => {
  const [year, month, day] = isoDate.split("-");
  return `${month}.${day}.${year.slice(-2)}`;
};

const formatTableDate = (isoDate) => {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
};

const FullScheduleEmail = ({ report, dateStr }) => (
  <>
    <p>Hi Team,</p>
    <p>
      Please find the Daily Schedule &amp; Changes for ({DAY_LABELS[report.dayOfWeek]}), ({dateStr}) below.
    </p>
    <p>
      Any changes from the original Work Order (WO), as well as any discrepancies identified, are documented in
      detail within the <strong>Client Notes</strong> column for reference.
    </p>
    <p>Please review and reach out with any questions.</p>
    <table cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
      <thead>
        <tr style={{ backgroundColor: "#29b6d8", color: "#ffffff" }}>
          {["Division", "Day", "Date", "Assignment/Route", "Operator", "Veh", "Pullout", "Start", "End", "Client Notes"].map(
            (heading) => (
              <th key={heading} style={{ border: "1px solid #94a3b8", textAlign: "left" }}>
                {heading}
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
        {report.rows.map((row, index) => {
          const notDeploying = row.status !== "active";
          const rowStyle = notDeploying
            ? { backgroundColor: "#fecaca", color: "#7f1d1d", fontWeight: "bold" }
            : { backgroundColor: index % 2 ? "#f1f5f9" : "#ffffff" };
          return (
            <tr key={row.routeId || `${row.route}-${index}`} style={rowStyle}>
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
  </>
);

const UpdatesEmail = ({ report, dateStr, requestWording }) => (
  <>
    <p>Good day, Team,</p>
    <p>
      Deployment has received the following request for {requestWording} for {DAY_LABELS[report.dayOfWeek]},{" "}
      {formatEmailDate(dateStr)}.
    </p>
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
      <thead>
        <tr>
          {[
            "Division",
            "Day",
            "Date",
            "Assignment / Route",
            "Operator",
            "Veh",
            "Pullout Address",
            "Start Time",
            "End Time",
            "Daily Changes",
            "Client Notes",
          ].map((heading) => (
            <th key={heading} style={headerStyle}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {report.rows.map((row, index) => {
          const operating = row.status === "active" || row.status === "add_rte";
          return (
            <tr key={row.routeId || `${row.route}-${index}`}>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{report.division.code}</td>
              <td style={{ ...cellStyle, fontWeight: 700, textAlign: "center" }}>{report.dayOfWeek}</td>
              <td style={{ ...cellStyle, fontWeight: 700, textAlign: "center" }}>{formatTableDate(dateStr)}</td>
              <td style={{ ...cellStyle, fontWeight: 700, textAlign: "center" }}>{row.route}</td>
              <td style={cellStyle}>{row.operator}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>{row.vehicle}</td>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{row.pulloutAddress}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>{row.startTime}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>{row.endTime}</td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: operating ? "#00b050" : "#ef1b23",
                  color: operating ? "#111827" : "#ffffff",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {row.dailyChanges}
              </td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: row.clientNotes ? "#ef1b23" : "#ffffff",
                  color: row.clientNotes ? "#ffffff" : "#111827",
                  fontWeight: row.clientNotes ? 700 : 400,
                }}
              >
                {row.clientNotes}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <p style={{ marginTop: 16 }}>
      Please make the necessary change on your schedule for {DAY_LABELS[report.dayOfWeek]},{" "}
      {formatEmailDate(dateStr)} to reflect the above changes.
    </p>
  </>
);

const ClientReport = () => {
  const { selectedDivision } = useOutletContext();
  const [reportType, setReportType] = useState("schedule");
  const [which, setWhich] = useState("today");
  const [requestWording, setRequestWording] = useState(UPDATE_WORDING);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const reportRef = useRef(null);

  const today = todayInTimezone(selectedDivision?.timezone);
  const targetDate = which === "today" ? today : addDays(today, 1);
  const dateStr = toISODate(targetDate);

  const [workOrderFrom, setWorkOrderFrom] = useState(toISODate(today));
  const [downloadingWorkOrder, setDownloadingWorkOrder] = useState(false);
  const [workOrderError, setWorkOrderError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return undefined;
    if (reportType === "workOrder") return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setCopyStatus("");
    const mode = reportType === "updates" ? "&mode=updates" : "";
    apiGet(`/api/reports/daily-schedule?division=${selectedDivision._id}&date=${dateStr}${mode}`)
      .then((data) => {
        if (!cancelled) setReport(data);
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
  }, [selectedDivision, dateStr, reportType]);

  const handleDownloadWorkOrder = async () => {
    if (!selectedDivision || !workOrderFrom) return;
    setDownloadingWorkOrder(true);
    setWorkOrderError("");
    try {
      const { blob, filename } = await apiDownload(
        `/api/reports/work-order?division=${encodeURIComponent(selectedDivision._id)}&from=${encodeURIComponent(workOrderFrom)}`
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setWorkOrderError(err.message);
    } finally {
      setDownloadingWorkOrder(false);
    }
  };

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
    } catch {
      setCopyStatus("Couldn't copy automatically — select the email below and copy it manually.");
    }
  };

  const copyDisabled = loading || !report?.rows?.length;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist" aria-label="Client report type">
        {[
          { key: "schedule", label: "Daily Schedule" },
          { key: "updates", label: "Updates" },
          { key: "workOrder", label: "Work Order" },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={reportType === option.key}
            onClick={() => setReportType(option.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              reportType === option.key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {reportType === "workOrder" ? (
        <div>
          <p className="mb-4 max-w-3xl text-sm text-slate-600">
            Downloads a 7-day Work Order for the selected division, one tab per weekday starting from the date
            below. Each day reflects the live schedule as it currently stands — including any day-specific OSR
            processed in Live Schedule — not just the persistent Master Run Cut. A Permanent OSR is reflected here
            the same way, since it becomes part of the standing plan.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              Start date
              <input
                type="date"
                aria-label="Work order start date"
                value={workOrderFrom}
                onChange={(event) => setWorkOrderFrom(event.target.value)}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleDownloadWorkOrder}
              disabled={downloadingWorkOrder || !workOrderFrom}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {downloadingWorkOrder ? "Downloading…" : "Download Work Order"}
            </button>
          </div>
          {workOrderError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{workOrderError}</p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex gap-1">
                {[
                  { key: "today", label: "Today", date: today },
                  { key: "tomorrow", label: "Tomorrow", date: addDays(today, 1) },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setWhich(option.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      which === option.key ? "bg-brand-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {option.label} <span className="opacity-70">({toISODate(option.date)})</span>
                  </button>
                ))}
              </div>
              {reportType === "updates" && (
                <label className="text-sm text-slate-600">
                  Request wording
                  <input
                    type="text"
                    aria-label="Request wording"
                    value={requestWording[which]}
                    onChange={(event) =>
                      setRequestWording((current) => ({ ...current, [which]: event.target.value }))
                    }
                    className="mt-1 block w-80 max-w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copyDisabled}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {reportType === "updates" ? "Copy update" : "Copy schedule"}
            </button>
          </div>

          {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {copyStatus && <p className="mb-4 text-sm text-slate-500">{copyStatus}</p>}
          {loading && <p className="text-sm text-slate-500">Loading…</p>}

          {!loading && reportType === "updates" && report?.rows?.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-700">No daily schedule exceptions to send.</p>
              <p className="mt-1 text-xs text-slate-500">
                Exceptions entered in Live Schedule for {which} will appear here.
              </p>
            </div>
          )}

          {!loading && report && (reportType === "schedule" || report.rows.length > 0) && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-6">
              <div
                ref={reportRef}
                style={{ minWidth: reportType === "updates" ? 1120 : 900, fontFamily: "Calibri, Arial, sans-serif", color: "#1e293b" }}
              >
                {reportType === "updates" ? (
                  <UpdatesEmail report={report} dateStr={dateStr} requestWording={requestWording[which]} />
                ) : (
                  <FullScheduleEmail report={report} dateStr={dateStr} />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientReport;
