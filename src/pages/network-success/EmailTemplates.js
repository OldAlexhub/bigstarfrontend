import { useEffect, useState } from "react";
import { apiGet } from "../../api/client";

const formatSize = (bytes) => `${Math.round((bytes / 1024) * 10) / 10} KB`;

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    apiGet("/api/network-success/email-templates")
      .then((data) => setTemplates(data.templates))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (template) => {
    setError("");
    setDownloadingId(template.id);
    try {
      const res = await fetch(
        `/api/network-success/email-templates/${encodeURIComponent(template.id)}/download`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Could not download this template.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const grouped = templates.reduce((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Email Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Official Outlook templates for provider notices and communications. These are the exact
          approved files — download and open in Outlook to use as-is.
        </p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading &&
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">{category}</h2>
            <ul className="divide-y divide-slate-100">
              {items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">
                      {t.filename} · {formatSize(t.sizeBytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(t)}
                    disabled={downloadingId === t.id}
                    className="shrink-0 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {downloadingId === t.id ? "Downloading…" : "Download"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {!loading && templates.length === 0 && !error && (
        <p className="text-sm text-slate-400">No templates available.</p>
      )}
    </div>
  );
};

export default EmailTemplates;
