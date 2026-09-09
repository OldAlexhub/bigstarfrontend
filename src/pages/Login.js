import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import teamPortrait from "../assets/0azJCkAQ-scaled-portrait-3baef0d59dcee84ff955aa25eebf617a-yxz3f84okjwv.jpeg";
import sloganBanner from "../assets/bigstar-linkedin-hero5.jpg";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative h-64 overflow-hidden bg-slate-900 lg:h-screen">
        <img
          src={teamPortrait}
          alt="Big Star Transit team member beside a vehicle"
          className="h-full w-full object-cover object-[center_42%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/10" />
      </section>

      <section className="flex min-h-[calc(100vh-16rem)] flex-col px-4 py-8 lg:min-h-screen lg:px-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-7 text-center">
              <img src={logo} alt="Big Star Transit" className="mx-auto h-auto w-full max-w-[280px]" />
              <p className="mt-3 text-sm text-slate-500">Sign in to continue</p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
              {error && (
                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <img
              src={sloganBanner}
              alt="Building businesses. Mobilizing communities."
              className="mt-5 w-full rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        </div>
        <p className="pt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Big Star Transit LLC
        </p>
      </section>
    </div>
  );
};

export default Login;
