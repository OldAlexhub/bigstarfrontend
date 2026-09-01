import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_ITEMS, canAccess } from "../config/nav";

const linkClasses = ({ isActive }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-500 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => canAccess(user, item.key));

  return (
    <nav className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <span className="shrink-0 text-lg font-bold tracking-tight text-brand-700">
            BigStar
          </span>
          <div className="flex items-center gap-1 overflow-x-auto">
            <NavLink to="/dashboard" className={linkClasses}>
              Dashboard
            </NavLink>
            {visibleItems.map((item) => (
              <NavLink key={item.key} to={item.path} className={linkClasses}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/settings" className={linkClasses}>
              Settings
            </NavLink>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
