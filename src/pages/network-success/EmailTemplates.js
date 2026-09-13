import { useMemo, useState } from "react";
import { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATES } from "./emailTemplateLibrary";

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" strokeLinecap="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmailTemplates = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All templates");

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return EMAIL_TEMPLATES.filter((template) => {
      const matchesCategory = category === "All templates" || template.category === category;
      const matchesSearch = !query || [template.title, template.category, template.useCase]
        .some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <section aria-labelledby="email-template-heading">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Provider communications</p>
              <h2 id="email-template-heading" className="mt-1 text-2xl font-semibold">Email Template Library</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Choose the situation, download the Outlook template, and review every provider-specific detail before sending.
              </p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-semibold">{EMAIL_TEMPLATES.length}</p>
              <p className="text-xs font-medium text-blue-100">templates ready to use</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-md">
              <span className="sr-only">Search email templates</span>
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><SearchIcon /></span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by template or use case"
                className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <div aria-label="Filter email templates by category" className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {EMAIL_TEMPLATE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    category === item
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500" aria-live="polite">
            Showing {visibleTemplates.length} of {EMAIL_TEMPLATES.length} templates
          </p>
        </div>
      </div>

      {visibleTemplates.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template) => (
            <article key={template.fileName} className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{template.category}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">.oft</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-6 text-slate-900">{template.title}</h3>
              <div className="mt-4 flex-1 border-l-2 border-brand-100 pl-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Use when</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{template.useCase}</p>
              </div>
              <a
                href={template.url}
                download={template.fileName}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
              >
                <DownloadIcon />
                Download template
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h3 className="font-semibold text-slate-900">No templates match</h3>
          <p className="mt-1 text-sm text-slate-500">Try a different search or choose another category.</p>
          <button type="button" onClick={() => { setSearch(""); setCategory("All templates"); }} className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            Clear filters
          </button>
        </div>
      )}

      <aside className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
        <p><span className="font-semibold">Before sending:</span> open the template in Outlook and confirm recipients, dates, route details, attachments, and all placeholder text.</p>
      </aside>
    </section>
  );
};

export default EmailTemplates;
