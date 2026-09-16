import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPage, firstAccessiblePath } from "../config/pageAccess";

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
  return canAccessPage(user, permission) ? children : <AccessDenied />;
};

export { AccessDenied };
export default PageAccessRoute;
