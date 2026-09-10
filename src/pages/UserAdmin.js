import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ROLES = ["ELT", "VP", "Director", "Sr Manager", "Manager", "Coordinator"];
const SECTIONS = [
  { key: "master_run_cuts", label: "Master Run Cuts" },
  { key: "deployment", label: "Deployment" },
  { key: "network_success", label: "Network Success" },
];

const emptyForm = {
  username: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  title: "",
  department: "",
  role: "Coordinator",
  sections: [],
  divisionAccess: [],
};

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const UserForm = ({ form, setForm, divisions, isEdit, onSubmit, onCancel, submitting, error }) => {
  const toggleSection = (key) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.includes(key) ? f.sections.filter((s) => s !== key) : [...f.sections, key],
    }));
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

      <div className="mt-3 flex flex-wrap gap-6">
        <div className="text-sm text-slate-600">
          Sections
          <div className="mt-1 flex flex-wrap gap-3">
            {SECTIONS.map((s) => (
              <label key={s.key} className="flex items-center gap-1.5">
                <input type="checkbox" checked={form.sections.includes(s.key)} onChange={() => toggleSection(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
        <div className="text-sm text-slate-600">
          Divisions
          <div className="mt-1 flex max-w-lg flex-wrap gap-3">
            {divisions.map((d) => (
              <label key={d._id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.divisionAccess.includes(d._id)}
                  onChange={() => toggleDivision(d._id)}
                />
                {d.code}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        ELT ignores sections and divisions entirely — an ELT user already has access to everything.
      </p>

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
      sections: user.sections || [],
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

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name} (${user.username})? This can't be undone.`)) return;
    setError("");
    try {
      await apiDelete(`/api/users/${user.id}`);
      load();
    } catch (err) {
      setError(err.message);
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
          Add, edit, deactivate, or remove users, and control which sections and divisions they can access.
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
                {["Name", "Username", "Email", "Role", "Title", "Department", "Sections", "Divisions", "Status", ""].map(
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
                      {u.role === "ELT" ? "All" : u.sections?.length ? u.sections.join(", ") : "—"}
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
                        <button onClick={() => handleDelete(u)} className="text-xs font-medium text-red-600 hover:underline">
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
    </div>
  );
};

export default UserAdmin;
