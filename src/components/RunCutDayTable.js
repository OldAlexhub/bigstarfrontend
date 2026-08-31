import { DISRUPTION_TYPES } from "../config/disruptionTypes";
import { DAYS_OF_WEEK } from "../utils/dates";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "unassigned", label: "Unassigned" },
  { value: "suspended", label: "Suspended" },
  { value: "off", label: "Off" },
  { value: "add_rte", label: "Add Rte" },
];

const STATUS_STYLES = {
  active: "bg-green-50 text-green-700",
  unassigned: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
  off: "bg-slate-100 text-slate-500",
  add_rte: "bg-blue-50 text-blue-700",
};

const toggleDay = (days, day) =>
  days.includes(day) ? days.filter((d) => d !== day) : DAYS_OF_WEEK.filter((d) => [...days, day].includes(d));

// Shared by Master Run Cuts' Run Cuts table (rows = the persistent RunCut
// assignment, one per route) and Deployment's Live Schedule (rows = that
// day's projected RunCutDay, one per route per date) — same shape either
// way, so this component doesn't care which it's rendering.
//
// Master Run Cuts owns the ongoing plan: Operator/Vehicle/Pullout/Start/End
// and Days render as inputs there (editableAssignment) — free-text with an
// autocomplete list, typing a new name/code creates it — and a Status
// change there is persistent, projecting forward onto every future
// scheduled day. Deployment owns the live day's exceptions: Status,
// Disruption, and Client Notes (showDisruptionAndNotes) are edited there
// instead, but apply to that one date only and never touch the plan (see
// server/utils/projectAssignment.js's override handling) — everything else
// stays read-only text sourced from the same projected values.
// onRemoveExtra (Deployment only) lets a one-off route added outside the
// normal schedule (isExtra) be taken back off that day.
const COLUMN_WIDTHS = {
  Division: 90,
  Route: 150,
  Operator: 130,
  Vehicle: 64,
  "Pullout Address": 150,
  Start: 70,
  End: 70,
  Status: 96,
  "Service Hrs": 68,
  "Revenue Hrs": 68,
  "Client Notes": 120,
  Disruption: 112,
  Flags: 120,
  Days: 186,
  Actions: 60,
};

const RunCutDayTable = ({
  rows,
  savingId,
  onPatch,
  emptyMessage,
  showDisruptionAndNotes = true,
  editableAssignment = false,
  operators = [],
  vehicles = [],
  onRemoveExtra,
  showDivisionColumn = false,
}) => {
  const headers = [
    ...(showDivisionColumn ? ["Division"] : []),
    "Route",
    "Operator",
    "Vehicle",
    "Pullout Address",
    "Start",
    "End",
    "Status",
    "Service Hrs",
    "Revenue Hrs",
    ...(showDisruptionAndNotes ? ["Client Notes", "Disruption"] : []),
    ...(editableAssignment ? ["Flags", "Days"] : []),
    ...(onRemoveExtra ? ["Actions"] : []),
  ];
  const tableWidth = headers.reduce((sum, h) => sum + COLUMN_WIDTHS[h], 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {editableAssignment && (
        <>
          <datalist id="rct-operators">
            {operators.map((o) => (
              <option key={o._id} value={o.name} />
            ))}
          </datalist>
          <datalist id="rct-vehicles">
            {vehicles.map((v) => (
              <option key={v._id} value={v.code} />
            ))}
          </datalist>
        </>
      )}
      <table
        className="table-fixed divide-y divide-slate-200 text-sm"
        style={{ width: "100%", minWidth: tableWidth }}
      >
        <colgroup>
          {headers.map((h) => (
            <col key={h} style={{ width: COLUMN_WIDTHS[h] }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="break-words px-2 py-2 text-left align-bottom font-medium leading-tight text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-400">
                {emptyMessage || "No routes yet."}
              </td>
            </tr>
          )}
          {rows.map((rc) => (
            <tr key={rc._id}>
              {showDivisionColumn && (
                <td className="truncate px-2 py-2 text-slate-600" title={rc.division?.name}>
                  {rc.division?.code || "—"}
                </td>
              )}
              <td className="flex items-center gap-1.5 overflow-hidden px-2 py-2 font-medium text-slate-900">
                <span className="truncate" title={rc.route?.code}>
                  {rc.route?.code}
                </span>
                {rc.route?.type === "standby" && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Standby
                  </span>
                )}
              </td>
              <td className="px-2 py-2">
                {editableAssignment ? (
                  <input
                    list="rct-operators"
                    defaultValue={rc.operator?.name || ""}
                    key={rc._id}
                    onBlur={(e) => {
                      if (e.target.value !== (rc.operator?.name || "")) {
                        onPatch(rc, { operatorName: e.target.value });
                      }
                    }}
                    placeholder="—"
                    className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="block truncate text-slate-600" title={rc.operator?.name}>
                    {rc.operator?.name || "—"}
                  </span>
                )}
              </td>
              <td className="px-2 py-2">
                {editableAssignment ? (
                  <input
                    list="rct-vehicles"
                    defaultValue={rc.vehicle?.code || ""}
                    key={rc._id}
                    onBlur={(e) => {
                      if (e.target.value !== (rc.vehicle?.code || "")) {
                        onPatch(rc, { vehicleCode: e.target.value });
                      }
                    }}
                    placeholder="—"
                    className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="block truncate text-slate-600">{rc.vehicle?.code || "—"}</span>
                )}
              </td>
              <td className="px-2 py-2">
                {editableAssignment ? (
                  <input
                    defaultValue={rc.pulloutAddress || ""}
                    key={rc._id}
                    onBlur={(e) => {
                      if (e.target.value !== (rc.pulloutAddress || "")) {
                        onPatch(rc, { pulloutAddress: e.target.value });
                      }
                    }}
                    placeholder="—"
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="block truncate text-slate-600" title={rc.pulloutAddress}>
                    {rc.pulloutAddress || "—"}
                  </span>
                )}
              </td>
              <td className="px-2 py-2">
                {editableAssignment ? (
                  <input
                    type="time"
                    value={rc.startTime || ""}
                    onChange={(e) => onPatch(rc, { startTime: e.target.value || null })}
                    className="w-full rounded-md border border-slate-200 px-1 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="whitespace-nowrap text-slate-600">{rc.startTime || "—"}</span>
                )}
              </td>
              <td className="px-2 py-2">
                {editableAssignment ? (
                  <input
                    type="time"
                    value={rc.endTime || ""}
                    onChange={(e) => onPatch(rc, { endTime: e.target.value || null })}
                    className="w-full rounded-md border border-slate-200 px-1 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <span className="whitespace-nowrap text-slate-600">{rc.endTime || "—"}</span>
                )}
              </td>
              <td className="px-2 py-2">
                <select
                  value={rc.status}
                  disabled={savingId === rc._id}
                  onChange={(e) => onPatch(rc, { status: e.target.value })}
                  className={`w-full whitespace-nowrap rounded-md border-0 px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 ${STATUS_STYLES[rc.status]}`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-slate-600">{rc.serviceHours?.toFixed(2)}</td>
              <td className="whitespace-nowrap px-2 py-2 text-slate-600">{rc.revenueHours?.toFixed(2)}</td>
              {showDisruptionAndNotes && (
                <>
                  <td className="px-2 py-2">
                    <input
                      defaultValue={rc.clientNotes || ""}
                      key={rc._id}
                      onBlur={(e) => {
                        if (e.target.value !== (rc.clientNotes || "")) {
                          onPatch(rc, { clientNotes: e.target.value });
                        }
                      }}
                      placeholder="—"
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={rc.disruptionType || ""}
                      disabled={savingId === rc._id}
                      onChange={(e) => onPatch(rc, { disruptionType: e.target.value || null })}
                      className="w-full whitespace-nowrap rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">None</option>
                      {DISRUPTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                </>
              )}
              {editableAssignment && (
                <td className="px-2 py-2">
                  {rc.vehicleConflict && (
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Duplicate vehicle
                    </span>
                  )}
                </td>
              )}
              {editableAssignment && (
                <td className="px-2 py-2">
                  <div className="flex gap-0.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = (rc.daysOfWeek || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={savingId === rc._id}
                          onClick={() => onPatch(rc, { daysOfWeek: toggleDay(rc.daysOfWeek || [], day) })}
                          title={day}
                          className={`h-6 w-6 rounded text-[10px] font-medium transition-colors ${
                            active ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {day[0]}
                        </button>
                      );
                    })}
                  </div>
                </td>
              )}
              {onRemoveExtra && (
                <td className="px-2 py-2">
                  {rc.isExtra && (
                    <button
                      type="button"
                      onClick={() => onRemoveExtra(rc)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunCutDayTable;
