import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessPage } from "../../config/pageAccess";

export const NETWORK_RESOURCE_TABS = [
  {
    permission: "network_success.email_templates",
    label: "Email Templates",
    path: "/network-success/resources/email-templates",
  },
  {
    permission: "network_success.ld_helper",
    label: "LD Helper",
    path: "/network-success/resources/ld-helper",
  },
  {
    permission: "network_success.tui_helper",
    label: "TUI Helper",
    path: "/network-success/resources/tui-helper",
  },
];

const visibleResourceTabs = (user) =>
  NETWORK_RESOURCE_TABS.filter((tab) => canAccessPage(user, tab.permission));

export const NetworkResourcesHome = () => {
  const { user } = useAuth();
  const destination = visibleResourceTabs(user)[0]?.path || "/access-denied";
  return <Navigate to={destination} replace />;
};

const NetworkResourcesLayout = () => {
  const { user } = useAuth();
  const tabs = visibleResourceTabs(user);

  return (
    <div>
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap gap-2" aria-label="Network Success resources">
          {tabs.map((tab) => (
            <NavLink
              key={tab.permission}
              to={tab.path}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
};

export default NetworkResourcesLayout;
