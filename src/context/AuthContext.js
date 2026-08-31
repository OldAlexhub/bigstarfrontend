import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiGet("/api/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        // Not logged in yet, or the backend is unreachable — either way,
        // stay on the login screen rather than surfacing a raw error here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    let data;
    try {
      data = await apiPost("/api/auth/login", { username, password });
    } catch (error) {
      // apiPost/client.js already falls back to {} on an unreadable body, so
      // a message-less failure here means the backend didn't respond the way
      // the app expects (unreachable, asleep, wrong URL) rather than a normal
      // wrong-password rejection — worth telling the user that distinction.
      throw new Error(
        error.message && error.message !== "Request failed"
          ? error.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
