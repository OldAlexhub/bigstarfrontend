import { createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPage, canWritePage, firstAccessiblePath, pageAccessLevel } from "../config/pageAccess";

const PagePermissionContext = createContext({ permission: null, accessLevel: null, canWrite: false });

const AccessDenied = () => {
  const { user } = useAuth();
  const destination = firstAccessiblePath(user, null);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h1 className="text-xl font-semibold text-amber-950">Access not assigned</h1>
      <p className="mt-2 text-sm text-amber-800">
        Your account does not have access to this page. Ask an ELT administrator if you need it.
      </p>
      {destination && (
        <Link to={destination} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to an available page
        </Link>
      )}
    </div>
  );
};

const PageAccessRoute = ({ permission, children }) => {
  const { user } = useAuth();
  if (!canAccessPage(user, permission)) return <AccessDenied />;

  const accessLevel = pageAccessLevel(user, permission);
  const canWrite = canWritePage(user, permission);
  return (
    <PagePermissionContext.Provider value={{ permission, accessLevel, canWrite }}>
      {!canWrite && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800" role="status">
          <span className="font-semibold">Read-only access.</span> You can view, filter, and export this page, but changes are blocked.
        </div>
      )}
      {children}
    </PagePermissionContext.Provider>
  );
};

export const usePagePermission = () => useContext(PagePermissionContext);

export { AccessDenied };
export default PageAccessRoute;
