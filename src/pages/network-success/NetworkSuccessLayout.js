import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { apiGet } from "../../api/client";
import { REALLOCATION_UPDATED_EVENT } from "../reallocationUi";
import { TEAM_POST_UPDATED_EVENT } from "../posts/postUi";
import { playNotificationSound } from "../../utils/notificationSound";
import { clearTabNotificationCount, setTabNotificationCount } from "../../utils/tabNotifications";

const NetworkSuccessLayout = () => {
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const acceptedCountRef = useRef(null);
  const postCountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadNotifications = () => {
      apiGet("/api/reallocation-requests/notifications")
        .then((data) => {
          if (cancelled) return;
          const nextCount = data.count || 0;
          if (acceptedCountRef.current !== null && nextCount > acceptedCountRef.current) {
            playNotificationSound();
          }
          acceptedCountRef.current = nextCount;
          setAcceptedCount(nextCount);
          setTabNotificationCount("network-accepted", nextCount);
        })
        .catch(() => {});
    };
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30_000);
    window.addEventListener("focus", loadNotifications);
    window.addEventListener(REALLOCATION_UPDATED_EVENT, loadNotifications);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
      window.removeEventListener(REALLOCATION_UPDATED_EVENT, loadNotifications);
      clearTabNotificationCount("network-accepted");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadNotifications = () => {
      apiGet("/api/team-posts/notifications?section=network_success")
        .then((data) => {
          if (cancelled) return;
          const nextCount = data.count || 0;
          if (postCountRef.current !== null && nextCount > postCountRef.current) {
            playNotificationSound();
          }
          postCountRef.current = nextCount;
          setPostCount(nextCount);
          setTabNotificationCount("network-posts", nextCount);
        })
        .catch(() => {});
    };
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30_000);
    window.addEventListener("focus", loadNotifications);
    window.addEventListener(TEAM_POST_UPDATED_EVENT, loadNotifications);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
      window.removeEventListener(TEAM_POST_UPDATED_EVENT, loadNotifications);
      clearTabNotificationCount("network-posts");
    };
  }, []);

  return (
    <div>
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Operations intelligence</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Network Success</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Turn source-system workbooks into reviewed, Deployment-enriched network records.
      </p>
    </div>
    <div className="mb-7 flex gap-6 overflow-x-auto border-b border-slate-200">
      <NavLink
        to="/network-success"
        end
        className={({ isActive }) =>
          `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500"
          }`
        }
      >
        Excel Submissions
      </NavLink>
      <NavLink
        to="/network-success/performance"
        className={({ isActive }) =>
          `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        Performance
      </NavLink>
      <NavLink
        to="/network-success/reallocation-requests"
        className={({ isActive }) =>
          `inline-flex shrink-0 border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        Reallocation Requests
        {acceptedCount > 0 && (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${acceptedCount} accepted requests`}>
            {acceptedCount > 99 ? "99+" : acceptedCount}
          </span>
        )}
      </NavLink>
      <NavLink
        to="/network-success/posts"
        className={({ isActive }) =>
          `inline-flex shrink-0 border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        Posts
        {postCount > 0 && (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${postCount} unread posts or responses`}>
            {postCount > 99 ? "99+" : postCount}
          </span>
        )}
      </NavLink>
      <NavLink
        to="/network-success/email-templates"
        className={({ isActive }) =>
          `inline-flex shrink-0 border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        Email Templates
      </NavLink>
      <NavLink
        to="/network-success/ld-helper"
        className={({ isActive }) =>
          `inline-flex shrink-0 border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        LD Helper
      </NavLink>
    </div>
    <Outlet />
    </div>
  );
};

export default NetworkSuccessLayout;
