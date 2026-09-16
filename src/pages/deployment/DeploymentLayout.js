import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { apiGet } from "../../api/client";
import { REALLOCATION_UPDATED_EVENT } from "../reallocationUi";
import { TEAM_POST_UPDATED_EVENT } from "../posts/postUi";
import { playNotificationSound } from "../../utils/notificationSound";
import { clearTabNotificationCount, setTabNotificationCount } from "../../utils/tabNotifications";
import { useAuth } from "../../context/AuthContext";
import { canAccessPage } from "../../config/pageAccess";

const TABS = [
  { to: "/deployment", label: "Live Schedule", end: true, permission: "deployment.live_schedule" },
  { to: "/deployment/standby-utilization", label: "STBY Utilization", end: false, permission: "deployment.standby_utilization" },
  { to: "/deployment/issue-log", label: "Issue Log", end: false, permission: "deployment.issue_log" },
  { to: "/deployment/client-report", label: "Client Report", end: false, permission: "deployment.client_report" },
  { to: "/deployment/reporting", label: "Reporting", end: false, permission: "deployment.reporting" },
  { to: "/deployment/schedule-history", label: "Schedule History", end: false, permission: "deployment.schedule_history" },
  { to: "/deployment/receiving-requests", label: "Receiving Requests", end: false, requestNotifications: true, permission: "deployment.receiving_requests" },
  { to: "/deployment/posts", label: "Posts", end: false, postNotifications: true, permission: "deployment.posts" },
  { to: "/deployment/tracker-log", label: "Tracker Log", end: false, permission: "deployment.tracker_log" },
];

const tabClasses = ({ isActive }) =>
  `border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
    isActive
      ? "border-brand-500 text-brand-700"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
  }`;

const DeploymentLayout = () => {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [pendingByDivision, setPendingByDivision] = useState({});
  const [postCount, setPostCount] = useState(0);
  const [postByDivision, setPostByDivision] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!canAccessPage(user, "deployment.posts")) return undefined;
    let cancelled = false;
    apiGet("/api/divisions")
      .then((data) => {
        if (cancelled) return;
        setDivisions(data.divisions);
        const requested = searchParams.get("division");
        const requestedIsValid = requested && data.divisions.some((d) => d._id === requested);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const postCountRef = useRef(null);

  useEffect(() => {
    if (!canAccessPage(user, "deployment.receiving_requests")) return undefined;
    let cancelled = false;
    const loadPostCount = () => {
      apiGet("/api/team-posts/notifications?section=deployment")
        .then((data) => {
          if (cancelled) return;
          const nextCount = data.count || 0;
          if (postCountRef.current !== null && nextCount > postCountRef.current) {
            playNotificationSound();
          }
          postCountRef.current = nextCount;
          setPostCount(nextCount);
          setPostByDivision(data.byDivision || {});
          setTabNotificationCount("deployment-posts", nextCount);
        })
        .catch(() => {});
    };
    loadPostCount();
    const interval = window.setInterval(loadPostCount, 30_000);
    window.addEventListener("focus", loadPostCount);
    window.addEventListener(TEAM_POST_UPDATED_EVENT, loadPostCount);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadPostCount);
      window.removeEventListener(TEAM_POST_UPDATED_EVENT, loadPostCount);
      clearTabNotificationCount("deployment-posts");
    };
  }, [user]);

  const selectedDivision = divisions.find((d) => d._id === selectedDivisionId) || null;

  const pendingRequestCountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadPendingCount = () => {
      apiGet("/api/reallocation-requests/pending-notifications")
        .then((data) => {
          if (cancelled) return;
          const nextCount = data.count || 0;
          if (pendingRequestCountRef.current !== null && nextCount > pendingRequestCountRef.current) {
            playNotificationSound();
          }
          pendingRequestCountRef.current = nextCount;
          setPendingRequestCount(nextCount);
          setPendingByDivision(data.byDivision || {});
          setTabNotificationCount("deployment-requests", nextCount);
        })
        .catch(() => {});
    };
    loadPendingCount();
    const interval = window.setInterval(loadPendingCount, 30_000);
    window.addEventListener("focus", loadPendingCount);
    window.addEventListener(REALLOCATION_UPDATED_EVENT, loadPendingCount);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadPendingCount);
      window.removeEventListener(REALLOCATION_UPDATED_EVENT, loadPendingCount);
      clearTabNotificationCount("deployment-requests");
    };
  }, []);

  const handleSelectDivision = (id) => {
    setSelectedDivisionId(id);
    setSearchParams({ division: id });
  };

  const divisionsNeedingAttention = divisions.filter(
    (division) => (pendingByDivision[division._id] || 0) + (postByDivision[division._id] || 0) > 0
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Deployment</h1>
        {divisions.length > 0 && (
          <select
            value={selectedDivisionId}
            onChange={(e) => handleSelectDivision(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {divisions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
                {pendingByDivision[d._id] || postByDivision[d._id]
                  ? ` (${[
                      pendingByDivision[d._id] ? `${pendingByDivision[d._id]} request${pendingByDivision[d._id] === 1 ? "" : "s"}` : "",
                      postByDivision[d._id] ? `${postByDivision[d._id]} post${postByDivision[d._id] === 1 ? "" : "s"}` : "",
                    ].filter(Boolean).join(", ")})`
                  : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {divisionsNeedingAttention.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" aria-label="Division alerts">
          <p className="text-sm font-semibold text-amber-900">Needs attention by division</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {divisionsNeedingAttention.map((division) => {
              const requestCount = pendingByDivision[division._id] || 0;
              const divisionPostCount = postByDivision[division._id] || 0;
              const details = [
                requestCount ? `${requestCount} request${requestCount === 1 ? "" : "s"}` : "",
                divisionPostCount ? `${divisionPostCount} post alert${divisionPostCount === 1 ? "" : "s"}` : "",
              ].filter(Boolean).join(", ");
              return (
                <button
                  key={division._id}
                  type="button"
                  onClick={() => handleSelectDivision(division._id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedDivisionId === division._id
                      ? "border-amber-500 bg-amber-200 text-amber-950"
                      : "border-amber-300 bg-white text-amber-800 hover:border-amber-500 hover:bg-amber-100"
                  }`}
                >
                  {division.name}: {details}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-slate-200">
        {TABS.filter((tab) => canAccessPage(user, tab.permission)).map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClasses}>
            {tab.label}
            {tab.requestNotifications && pendingRequestCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${pendingRequestCount} pending requests`}>
                {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
              </span>
            )}
            {tab.postNotifications && postCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${postCount} unread posts or responses`}>
                {postCount > 99 ? "99+" : postCount}
              </span>
            )}
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
        <Outlet context={{ divisions, selectedDivision, setSelectedDivisionId: handleSelectDivision }} />
      )}
    </div>
  );
};

export default DeploymentLayout;
