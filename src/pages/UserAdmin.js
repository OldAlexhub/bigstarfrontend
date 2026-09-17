import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  effectivePageAccess,
  effectivePageAccessLevels,
  PAGE_ACCESS_GROUPS,
  PAGE_ACCESS_KEYS,
} from "../config/pageAccess";

const ROLES = ["ELT", "VP", "Director", "Sr Manager", "Manager", "Coordinator"];
const emptyForm = {
  username: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  title: "",
  department: "",
  role: "Coordinator",
  pageAccess: [],
  pageAccessLevels: {},
  divisionAccess: [],
};

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const UserForm = ({ form, setForm, divisions, isEdit, onSubmit, onCancel, submitting, error }) => {
  const togglePage = (key) => {
    setForm((f) => {
      const isSelected = f.pageAccess.includes(key);
      const pageAccessLevels = { ...f.pageAccessLevels };
      if (isSelected) delete pageAccessLevels[key];
      else pageAccessLevels[key] = "read";
      return {
        ...f,
        pageAccess: isSelected ? f.pageAccess.filter((page) => page !== key) : [...f.pageAccess, key],
        pageAccessLevels,
      };
    });
  };
  const setGroupAccess = (pages, enabled) => {
    const keys = pages.map((page) => page.key);
    setForm((f) => {
      const pageAccessLevels = { ...f.pageAccessLevels };
      keys.forEach((key) => {
        if (enabled) pageAccessLevels[key] ||= "read";
        else delete pageAccessLevels[key];
      });
      return {
        ...f,
        pageAccess: enabled
          ? [...new Set([...f.pageAccess, ...keys])]
          : f.pageAccess.filter((page) => !keys.includes(page)),
        pageAccessLevels,
      };
    });
  };
  const setPageAccessLevel = (key, level) => {
    setForm((f) => ({
      ...f,
      pageAccessLevels: { ...f.pageAccessLevels, [key]: level },
    }));
  };
  const selectAllPages = () => {
    setForm((f) => ({
      ...f,
      pageAccess: [...PAGE_ACCESS_KEYS],
      pageAccessLevels: Object.fromEntries(PAGE_ACCESS_KEYS.map((key) => [key, "read"])),
    }));
  };
  const clearAllPages = () => {
    setForm((f) => ({ ...f, pageAccess: [], pageAccessLevels: {} }));
  };
  const toggleDivision = (id) => {
    setForm((f) => ({
      ...f,
      divisionAccess: f.divisionAccess.includes(id)
        ? f.divisionAccess.filter((d) => d !== id)
        : [...f.divisionAccess, id],
    }));
  };

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">
          Username
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            disabled={isEdit}
            className={`${inputClasses} disabled:bg-slate-100`}
          />
        </label>
        <label className="text-sm text-slate-600">
          {isEdit ? "New Password (leave blank to keep)" : "Password"}
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!isEdit}
            className={inputClasses}
          />
        </label>
        <label className="text-sm text-slate-600">
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClasses} />
        </label>
        <label className="text-sm text-slate-600">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClasses}
          />
        </label>
        <label className="text-sm text-slate-600">
          Phone
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClasses} />
        </label>
        <label className="text-sm text-slate-600">
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClasses} />
        </label>
        <label className="text-sm text-slate-600">
          Department
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className={inputClasses}
          />
        </label>
        <label className="text-sm text-slate-600">
          Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClasses}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Site and tab access</h3>
            <p className="mt-0.5 text-xs text-slate-500">Choose each page this user can open, then assign read-only or read-and-write access.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={form.role === "ELT"} onClick={selectAllPages} className="text-xs font-medium text-brand-700 hover:underline disabled:text-slate-400">Select all (read only)</button>
            <button type="button" disabled={form.role === "ELT"} onClick={clearAllPages} className="text-xs font-medium text-slate-600 hover:underline disabled:text-slate-400">Clear all</button>
          </div>
        </div>
        {form.role === "ELT" && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">ELT automatically has read-and-write access to every site page and division.</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PAGE_ACCESS_GROUPS.map((group) => {
            const allSelected = group.pages.every((page) => form.pageAccess.includes(page.key));
            return (
              <fieldset key={group.key} disabled={form.role === "ELT"} className="rounded-lg border border-slate-200 bg-white p-3 disabled:opacity-60">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <legend className="text-sm font-semibold text-slate-700">{group.label}</legend>
                  <button type="button" onClick={() => setGroupAccess(group.pages, !allSelected)} className="text-[11px] font-medium text-brand-700 hover:underline">
                    {allSelected ? "Clear group" : "Select group"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {group.pages.map((page) => {
                    const selected = form.pageAccess.includes(page.key);
                    return (
                      <div key={page.key} className="flex items-start gap-2 rounded-md py-1 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          aria-label={page.label}
                          className="mt-2"
                          checked={selected}
                          onChange={() => togglePage(page.key)}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block">{page.label}</span>
                          {page.description && <span className="mt-0.5 block text-xs leading-4 text-slate-400">{page.description}</span>}
                        </div>
                        <select
                          aria-label={`${page.label} access level`}
                          value={form.pageAccessLevels?.[page.key] || "read"}
                          onChange={(event) => setPageAccessLevel(page.key, event.target.value)}
                          disabled={!selected}
                          className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="read">Read only</option>
                          <option value="write">Read &amp; write</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Divisions
        <div className="mt-1 flex max-w-lg flex-wrap gap-3">
          {divisions.map((d) => (
            <label key={d._id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={form.role === "ELT"}
                checked={form.divisionAccess.includes(d._id)}
                onChange={() => toggleDivision(d._id)}
              />
              {d.code}
            </label>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">Division choices control which division records are visible inside the assigned pages.</p>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create user"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const UserAdmin = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([apiGet("/api/users"), apiGet("/api/divisions")])
      .then(([u, d]) => {
        setUsers(u.users);
        setDivisions(d.divisions);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    let cancelled = false;
    const refreshDivisions = () => {
      apiGet("/api/divisions")
        .then((data) => {
          if (!cancelled) setDivisions(data.divisions || []);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refreshDivisions);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshDivisions);
    };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      await apiPost("/api/users", addForm);
      setAddForm(emptyForm);
      setShowAdd(false);
      load();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      username: user.username,
      password: "",
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      title: user.title || "",
      department: user.department || "",
      role: user.role,
      pageAccess: effectivePageAccess(user),
      pageAccessLevels: effectivePageAccessLevels(user),
      divisionAccess: (user.divisionAccess || []).map((d) => d._id || d),
    });
    setEditError("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      await apiPatch(`/api/users/${editingId}`, payload);
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    setError("");
    try {
      await apiPatch(`/api/users/${user.id}`, { active: !user.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setError("");
    setDeleting(true);
    try {
      await apiDelete(`/api/users/${deleteCandidate.id}`);
      setDeleteCandidate(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (currentUser && currentUser.role !== "ELT") {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
        User administration is restricted to ELT.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">User Administration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add, edit, deactivate, or remove users, and control both page visibility and read/write access.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/settings" className="text-brand-600 hover:underline">
            ← Back to Settings
          </Link>
        </p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showAdd && (
        <UserForm
          form={addForm}
          setForm={setAddForm}
          divisions={divisions}
          isEdit={false}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          submitting={adding}
          error={addError}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Name", "Username", "Email", "Role", "Title", "Department", "Pages", "Divisions", "Status", ""].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) =>
                editingId === u.id ? (
                  <tr key={u.id}>
                    <td colSpan={10} className="p-0">
                      <UserForm
                        form={editForm}
                        setForm={setEditForm}
                        divisions={divisions}
                        isEdit
                        onSubmit={handleSaveEdit}
                        onCancel={() => setEditingId(null)}
                        submitting={saving}
                        error={editError}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{u.name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{u.username}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{u.email || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{u.role}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{u.title || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{u.department || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {u.role === "ELT"
                        ? "All · read & write"
                        : `${effectivePageAccess(u).length} of ${PAGE_ACCESS_KEYS.length} · ${Object.values(effectivePageAccessLevels(u)).filter((level) => level === "write").length} write`}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {u.role === "ELT" ? "All" : u.divisionAccess?.map((d) => d.code).join(", ") || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(u)} className="text-xs font-medium text-brand-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(u)} className="text-xs font-medium text-amber-600 hover:underline">
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => setDeleteCandidate(u)} className="text-xs font-medium text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeleteCandidate(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id="delete-user-title" className="text-lg font-semibold text-slate-900">Delete this user?</h2>
                <p id="delete-user-description" className="mt-1 text-sm leading-6 text-slate-600">
                  This permanently deletes <span className="font-semibold text-slate-900">{deleteCandidate.name}</span>
                  {deleteCandidate.username ? ` (${deleteCandidate.username})` : ""}. This action cannot be undone.
                </p>
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  If access should only be paused, cancel and use Deactivate instead.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAdmin;
