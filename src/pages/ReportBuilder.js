import { useEffect, useMemo, useState } from "react";
import { apiDownload, apiGet } from "../api/client";
import { DISRUPTION_TYPES } from "../config/disruptionTypes";
import { addDays, toISODate, todayInTimezone } from "../utils/dates";
import { useLatestRequest } from "../hooks/useLatestRequest";

const STORAGE_KEY = "bigstar.reportBuilder.savedViews.v1";

const SOURCE_DEFINITIONS = {
  operations: {
    label: "Division performance",
    description: "Compare fulfillment, coverage, and service risk across divisions.",
    defaultSort: "name",
    fields: [
      ["code", "Division Code"],
      ["name", "Division"],
      ["runCutFulfillmentPct", "Run Cut Fulfillment"],
      ["plannedRevenueHourFulfillmentPct", "Planned Revenue Fulfillment"],
      ["actualRevenueHourFulfillmentPct", "Actual Revenue Fulfillment"],
      ["actualRevenueHours", "Actual Revenue Hours"],
      ["actualRevenueHoursPlanned", "Comparable Planned Hours"],
      ["actualRevenueComparableRouteDays", "Comparable Route Days"],
      ["revenueHoursScheduled", "Revenue Hours Scheduled"],
      ["revenueHoursCovered", "Revenue Hours Covered"],
      ["revenueHoursAtRisk", "Revenue Hours At Risk"],
      ["totalClosures", "Closures"],
      ["totalLateFirst", "Late to First"],
      ["totalLateDeploy", "Late Deploy"],
      ["unassignedRoutesCount", "Unassigned Routes"],
      ["issueCount", "Issues Logged"],
    ],
    defaultFields: [
      "name",
      "runCutFulfillmentPct",
      "actualRevenueHourFulfillmentPct",
      "revenueHoursAtRisk",
      "totalClosures",
      "totalLateFirst",
      "totalLateDeploy",
      "unassignedRoutesCount",
    ],
  },
  issues: {
    label: "Issues and disruptions",
    description: "Build a detailed register for investigations, follow-up, or client records.",
    defaultSort: "date",
    fields: [
      ["divisionCode", "Division Code"],
      ["divisionName", "Division"],
      ["date", "Service Date"],
      ["routeCode", "Route"],
      ["disruptionType", "Issue Type"],
      ["notes", "Notes"],
    ],
    defaultFields: ["divisionName", "date", "routeCode", "disruptionType", "notes"],
  },
  network_raw: {
    label: "Network Success raw performance",
    description: "Export confirmed Vision and Ecolane source rows exactly once, without rollups, scoring, or analysis.",
    defaultSort: "date",
    fields: [
      ["divisionCode", "Division Code"],
      ["divisionName", "Division"],
      ["source", "Upload Source"],
      ["fileName", "Uploaded File"],
      ["confirmedAt", "Confirmed At"],
      ["date", "Service Date"],
      ["sourceRow", "Source Row"],
      ["sourceRoute", "Source Route"],
      ["sourceOperator", "Source Operator"],
      ["matchedRoute", "Matched Route"],
      ["matchedOperator", "Matched Operator"],
      ["matchedProvider", "Matched Provider"],
      ["completedTrips", "Completed Trips"],
      ["reportedServiceHours", "Reported Service Hours"],
      ["reportedRevenueHours", "Reported Revenue Hours"],
      ["tpsh", "Uploaded TPSH"],
      ["otpPct", "Uploaded OTP"],
      ["zeroTrips", "Zero Trips"],
    ],
    defaultFields: [
      "divisionName",
      "source",
      "date",
      "sourceRoute",
      "matchedOperator",
      "completedTrips",
      "tpsh",
      "otpPct",
    ],
  },
};

const TEMPLATES = [
  {
    id: "scorecard",
    eyebrow: "Executive",
    name: "Operations scorecard",
    description: "A balanced division-by-division performance review.",
    source: "operations",
    focus: "all",
    title: "Operations Scorecard",
    sort: "name",
    direction: "asc",
  },
  {
    id: "risk",
    eyebrow: "Action",
    name: "Service risk brief",
    description: "Only divisions with coverage, closure, late, or staffing risk.",
    source: "operations",
    focus: "attention",
    title: "Service Risk Brief",
    sort: "revenueHoursAtRisk",
    direction: "desc",
    fields: [
      "name",
      "runCutFulfillmentPct",
      "revenueHoursAtRisk",
      "totalClosures",
      "totalLateFirst",
      "totalLateDeploy",
      "unassignedRoutesCount",
    ],
  },
  {
    id: "issues",
    eyebrow: "Detail",
    name: "Issue register",
    description: "Every logged issue, searchable and ready for follow-up.",
    source: "issues",
    issueType: "all",
    title: "Issue Detail Report",
    sort: "date",
    direction: "desc",
  },
  {
    id: "closures",
    eyebrow: "Service",
    name: "Closure register",
    description: "Route closures and unperformed duties in one clean log.",
    source: "issues",
    issueType: "closures",
    title: "Route Closure Register",
    sort: "date",
    direction: "desc",
  },
  {
    id: "osr",
    eyebrow: "Orion",
    name: "OSR log",
    description: "A focused record of Orion service requests across divisions.",
    source: "issues",
    issueType: "osr",
    title: "Orion Service Request Log",
    sort: "date",
    direction: "desc",
  },
  {
    id: "network-raw",
    eyebrow: "Raw data",
    name: "NS upload rows",
    description: "Source-faithful Vision and Ecolane rows with no analysis.",
    source: "network_raw",
    networkSource: "all",
    title: "Network Success Raw Performance Data",
    sort: "date",
    direction: "desc",
  },
];

const defaultConfig = () => ({
  title: "Operations Scorecard",
  source: "operations",
  from: toISODate(addDays(todayInTimezone(), -29)),
  to: toISODate(todayInTimezone()),
  divisionIds: [],
  focus: "all",
  issueType: "all",
  networkSource: "all",
  search: "",
  fields: SOURCE_DEFINITIONS.operations.defaultFields,
  sort: SOURCE_DEFINITIONS.operations.defaultSort,
  direction: "asc",
});

const queryFor = (config, extras = {}) => {
  const params = new URLSearchParams({
    from: config.from,
    to: config.to,
    source: config.source,
    focus: config.focus,
    issueType: config.issueType,
    networkSource: config.networkSource,
    search: config.search,
    fields: config.fields.join(","),
    sort: config.sort,
    direction: config.direction,
    ...extras,
  });
  if (config.divisionIds.length) params.set("divisions", config.divisionIds.join(","));
  return params;
};

const dataConfig = (config) => ({ ...config, title: "" });
const sameDataConfig = (left, right) => JSON.stringify(dataConfig(left)) === JSON.stringify(dataConfig(right));

const loadSavedViews = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
};

const saveViews = (views) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // A private or locked-down browser may disable storage. The report itself still works.
  }
};

const downloadBlob = ({ blob, filename }) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const FieldIcon = ({ type }) => (
  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${type === "issues" ? "bg-amber-50 text-amber-700" : type === "network_raw" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>
    {type === "issues" ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v4m0 4h.01M10.3 3.8 2.8 17a2 2 0 0 0 1.74 3h14.92a2 2 0 0 0 1.74-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      </svg>
    ) : type === "network_raw" ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM4 9h16M9 4v16m5-11v11" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
      </svg>
    )}
  </span>
);

const ReportBuilder = () => {
  const initialConfig = useMemo(defaultConfig, []);
  const [divisions, setDivisions] = useState([]);
  const [config, setConfig] = useState(initialConfig);
  const [appliedConfig, setAppliedConfig] = useState(initialConfig);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [savedViews, setSavedViews] = useState(loadSavedViews);
  const [notice, setNotice] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    apiGet("/api/divisions")
      .then((data) => setDivisions(data.divisions || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/report-builder?${queryFor(appliedConfig, { limit: "50" })}`)
      .then((data) => {
        if (isCurrent(requestId)) setPreview(data);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedConfig]);

  const source = SOURCE_DEFINITIONS[config.source];
  const dirty = !sameDataConfig(config, appliedConfig);
  const selectedDivisionLabel = config.divisionIds.length
    ? `${config.divisionIds.length} selected`
    : "All accessible";

  const updateSource = (nextSource) => {
    const definition = SOURCE_DEFINITIONS[nextSource];
    setConfig((current) => ({
      ...current,
      source: nextSource,
      fields: definition.defaultFields,
      sort: definition.defaultSort,
      direction: nextSource === "issues" ? "desc" : "asc",
      focus: "all",
      issueType: "all",
      networkSource: "all",
    }));
  };

  const toggleDivision = (id) => {
    setConfig((current) => ({
      ...current,
      divisionIds: current.divisionIds.includes(id)
        ? current.divisionIds.filter((value) => value !== id)
        : [...current.divisionIds, id],
    }));
  };

  const toggleField = (key) => {
    setConfig((current) => {
      const selected = current.fields.includes(key);
      if (selected && current.fields.length === 1) return current;
      const fields = selected
        ? current.fields.filter((field) => field !== key)
        : [...current.fields, key];
      return { ...current, fields };
    });
  };

  const applyTemplate = (template) => {
    const definition = SOURCE_DEFINITIONS[template.source];
    const next = {
      ...config,
      source: template.source,
      focus: template.focus || "all",
      issueType: template.issueType || "all",
      networkSource: template.networkSource || "all",
      title: template.title,
      search: "",
      fields: template.fields || definition.defaultFields,
      sort: template.sort || definition.defaultSort,
      direction: template.direction || "asc",
    };
    setConfig(next);
    setAppliedConfig(next);
    setNotice(`${template.name} is ready to review.`);
  };

  const applyFilters = () => {
    if (!config.from || !config.to || config.from > config.to) {
      setError("Choose a valid date range. From must be on or before To.");
      return;
    }
    setNotice("");
    setAppliedConfig({ ...config });
  };

  const saveView = () => {
    const name = config.title.trim() || "Untitled report";
    const saved = { id: `${Date.now()}`, name, config: { ...config, title: name } };
    const next = [saved, ...savedViews.filter((view) => view.name.toLowerCase() !== name.toLowerCase())].slice(0, 10);
    setSavedViews(next);
    saveViews(next);
    setNotice(`Saved "${name}" to this browser.`);
  };

  const openSavedView = (id) => {
    const saved = savedViews.find((view) => view.id === id);
    if (!saved) return;
    const definition = SOURCE_DEFINITIONS[saved.config?.source];
    if (!definition) return;
    const next = {
      ...defaultConfig(),
      ...saved.config,
      fields: (saved.config.fields || []).filter((key) => definition.fields.some(([field]) => field === key)),
    };
    if (!next.fields.length) next.fields = definition.defaultFields;
    setConfig(next);
    setAppliedConfig(next);
    setNotice(`Loaded "${saved.name}".`);
  };

  const removeSavedView = (id) => {
    const next = savedViews.filter((view) => view.id !== id);
    setSavedViews(next);
    saveViews(next);
    setNotice("Saved view removed.");
  };

  const exportReport = async (format) => {
    if (dirty) return;
    setDownloading(format);
    setError("");
    try {
      const params = queryFor(appliedConfig, { format, title: config.title.trim() || "BigStar Report" });
      const file = await apiDownload(`/api/report-builder/export?${params}`);
      downloadBlob(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading("");
    }
  };

  const pdfTooWide = appliedConfig.fields.length > 8;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Reporting workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Build the report you actually need.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Start with a smart template, narrow the audience and date range, choose only the fields that matter, then export a clean deliverable.
            </p>
          </div>
          <div className="w-full rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm lg:w-80">
            <label htmlFor="saved-report" className="text-xs font-semibold uppercase tracking-wide text-blue-100">Saved views</label>
            <div className="mt-2 flex gap-2">
              <select
                id="saved-report"
                defaultValue=""
                onChange={(event) => {
                  openSavedView(event.target.value);
                  event.target.value = "";
                }}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-blue-300"
              >
                <option value="">{savedViews.length ? "Open a saved view..." : "No saved views yet"}</option>
                {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
              </select>
              <button type="button" onClick={saveView} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-blue-50">
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="templates-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Quick start</p>
            <h2 id="templates-heading" className="mt-1 text-lg font-semibold text-slate-900">Smart templates</h2>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Templates keep every setting editable.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {TEMPLATES.map((template) => {
            const active = config.title === template.title && config.source === template.source;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className={`group rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200" : "border-slate-200 bg-white hover:border-brand-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <FieldIcon type={template.source} />
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{template.eyebrow}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{template.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{template.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:self-start">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Configure</p>
              <h2 className="mt-1 font-semibold text-slate-900">Report controls</h2>
            </div>
            {dirty && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">Not applied</span>}
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            Report name
            <input
              value={config.title}
              maxLength={80}
              onChange={(event) => setConfig({ ...config, title: event.target.value })}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Data source
            <select
              value={config.source}
              onChange={(event) => updateSource(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {Object.entries(SOURCE_DEFINITIONS).map(([key, definition]) => <option key={key} value={key}>{definition.label}</option>)}
            </select>
            <span className="mt-1.5 block font-normal leading-5 text-slate-400">{source.description}</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-600">
              From
              <input type="date" aria-label="From date" value={config.from} onChange={(event) => setConfig({ ...config, from: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To
              <input type="date" aria-label="To date" value={config.to} onChange={(event) => setConfig({ ...config, to: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500" />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">Divisions</p>
              <button type="button" onClick={() => setConfig({ ...config, divisionIds: [] })} className="text-[11px] font-semibold text-brand-700 hover:underline">Select all</button>
            </div>
            <p className="mt-1 text-xs text-slate-400">{selectedDivisionLabel}</p>
            <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {divisions.map((division) => {
                const selected = config.divisionIds.includes(division._id);
                return (
                  <button
                    key={division._id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleDivision(division._id)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${selected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300"}`}
                  >
                    {division.code}
                  </button>
                );
              })}
            </div>
          </div>

          {config.source === "operations" ? (
            <label className="block text-xs font-semibold text-slate-600">
              Focus
              <select value={config.focus} onChange={(event) => setConfig({ ...config, focus: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-500">
                <option value="all">All divisions</option>
                <option value="attention">Needs attention</option>
                <option value="fulfillment">Below 97% run cut fulfillment</option>
                <option value="revenue_risk">Revenue hours at risk</option>
                <option value="closures">Has route closures</option>
              </select>
            </label>
          ) : config.source === "issues" ? (
            <label className="block text-xs font-semibold text-slate-600">
              Issue type
              <select value={config.issueType} onChange={(event) => setConfig({ ...config, issueType: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-500">
                <option value="all">All issue types</option>
                <option value="closures">Closures and unperformed duties</option>
                <option value="osr">Orion service requests</option>
                <option value="late">Late service events</option>
                <option value="vehicle">Vehicle and technical issues</option>
                {DISRUPTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          ) : (
            <label className="block text-xs font-semibold text-slate-600">
              Upload source
              <select aria-label="Upload source" value={config.networkSource} onChange={(event) => setConfig({ ...config, networkSource: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-500">
                <option value="all">Vision and Ecolane</option>
                <option value="vision">Vision only</option>
                <option value="ecolane">Ecolane only</option>
              </select>
              <span className="mt-1.5 block font-normal leading-5 text-slate-400">Only confirmed uploaded rows are included.</span>
            </label>
          )}

          <label className="block text-xs font-semibold text-slate-600">
            Find in report
            <input
              type="search"
              value={config.search}
              placeholder={config.source === "issues" ? "Division, route, note..." : config.source === "network_raw" ? "Route, operator, file..." : "Division name or code..."}
              onChange={(event) => setConfig({ ...config, search: event.target.value })}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
          </label>

          <div className="grid grid-cols-[1fr_105px] gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Sort by
              <select value={config.sort} onChange={(event) => setConfig({ ...config, sort: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal outline-none focus:border-brand-500">
                {source.fields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Direction
              <select value={config.direction} onChange={(event) => setConfig({ ...config, direction: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal outline-none focus:border-brand-500">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Columns</p>
              <span className="text-[11px] text-slate-400">{config.fields.length} selected</span>
            </div>
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {source.fields.map(([key, label]) => {
                const checked = config.fields.includes(key);
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    <input type="checkbox" checked={checked} disabled={checked && config.fields.length === 1} onChange={() => toggleField(key)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={applyFilters} disabled={loading && !dirty} className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50">
            {loading && !dirty ? "Building preview..." : "Apply and preview"}
          </button>

          {savedViews.length > 0 && (
            <details className="border-t border-slate-100 pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">Manage saved views ({savedViews.length})</summary>
              <div className="mt-2 space-y-1.5">
                {savedViews.map((view) => (
                  <div key={view.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5">
                    <button type="button" onClick={() => openSavedView(view.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-slate-700 hover:text-brand-700">{view.name}</button>
                    <button type="button" aria-label={`Delete ${view.name}`} onClick={() => removeSavedView(view.id)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </aside>

        <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-slate-900">{config.title || "Untitled report"}</h2>
                {!dirty && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Preview current</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {preview?.source?.label || source.label} - {appliedConfig.from} to {appliedConfig.to}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => exportReport("csv")} disabled={dirty || !!downloading || loading} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                {downloading === "csv" ? "Exporting..." : "CSV"}
              </button>
              <button type="button" onClick={() => exportReport("pdf")} disabled={dirty || !!downloading || loading || pdfTooWide} title={pdfTooWide ? "Select 8 or fewer columns for PDF" : "Export a presentation-ready PDF"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                {downloading === "pdf" ? "Exporting..." : "PDF"}
              </button>
              <button type="button" onClick={() => exportReport("xlsx")} disabled={dirty || !!downloading || loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                {downloading === "xlsx" ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          </div>

          {dirty && (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
              You changed the report settings. Apply them to refresh the preview and enable exports.
            </div>
          )}
          {pdfTooWide && !dirty && (
            <div className="border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-xs text-blue-800">
              PDF is optimized for up to 8 columns. Excel and CSV support the full field set.
            </div>
          )}

          <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
            {[
              ["Matching records", preview?.total ?? "-"],
              ["Divisions", preview?.divisionCount ?? "-"],
              ["Selected fields", preview?.columns?.length ?? appliedConfig.fields.length],
              ["Preview rows", preview?.rows?.length ?? "-"],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="min-h-80 overflow-x-auto">
            {loading ? (
              <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-slate-500">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Building your preview...
              </div>
            ) : preview?.rows?.length ? (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {preview.columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row, index) => (
                    <tr key={`${index}-${preview.columns.map((column) => row[column.key]).join("-")}`} className="hover:bg-slate-50/80">
                      {preview.columns.map((column) => (
                        <td key={column.key} className={`px-4 py-3 text-slate-700 ${column.key === "notes" ? "min-w-72 max-w-xl whitespace-normal" : "whitespace-nowrap"}`}>
                          {row[column.key] || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No records match this report</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Broaden the date range, select more divisions, or clear the focus filter.</p>
              </div>
            )}
          </div>

          {preview?.total > preview?.rows?.length && (
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-xs text-slate-500">
              Showing the first {preview.rows.length} of {preview.total} records. Exports include every matching record.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ReportBuilder;
