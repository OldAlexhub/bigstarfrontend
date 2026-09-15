import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../api/client";
import {
  formatPostDateTime,
  formatPostPerson,
  POST_SECTION_LABELS,
  TEAM_POST_UPDATED_EVENT,
} from "./postUi";

const EMPTY_FORM = {
  purpose: "",
  title: "",
  body: "",
  responseRequested: false,
};

const ResponseEditor = ({ post, section, onResponded, onError }) => {
  const [responseBody, setResponseBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    onError("");
    try {
      const data = await apiPost(`/api/team-posts/${post._id}/respond`, { section, responseBody });
      setResponseBody("");
      onResponded(data.post, data.message || "Response sent.");
    } catch (err) {
      onError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <label className="block text-sm font-medium text-blue-900">
        Response
        <textarea
          value={responseBody}
          onChange={(event) => setResponseBody(event.target.value)}
          maxLength={120}
          required
          rows={2}
          placeholder="Write a response…"
          className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 font-normal text-slate-800"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-blue-700">{responseBody.length}/120 characters</span>
        <button
          type="submit"
          disabled={sending || !responseBody.trim()}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send response"}
        </button>
      </div>
    </form>
  );
};

const PostCard = ({ post, section, onResponded, onError }) => {
  const incoming = post.direction === "received";
  const senderTeam = POST_SECTION_LABELS[post.fromSection] || post.fromSection;
  const recipientTeam = POST_SECTION_LABELS[post.toSection] || post.toSection;

  return (
    <article className={`rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm ${post.unread ? "border-brand-300 ring-1 ring-brand-100" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{post.title}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{post.purpose}</span>
          {post.unread && <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">New</span>}
          {post.responseRequested && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${post.status === "responded" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
              {post.status === "responded" ? "Responded" : "Response requested"}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{formatPostDateTime(post.createdAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{post.body}</p>
      <p className="mt-1 truncate text-[11px] text-slate-400">
        {formatPostPerson(post, "sent")} · {senderTeam} → {recipientTeam}
      </p>

      {post.status === "responded" && (
        <div className="mt-2 rounded-md border-l-2 border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
          <p className="text-slate-800">{post.responseBody}</p>
          <p className="mt-1 text-[11px] text-emerald-700">
            {formatPostPerson(post, "responded")} · {formatPostDateTime(post.respondedAt)}
          </p>
        </div>
      )}

      {incoming && post.responseRequested && post.status === "sent" && (
        <ResponseEditor post={post} section={section} onResponded={onResponded} onError={onError} />
      )}
    </article>
  );
};

const POST_PAGE_SIZE = 3;

const PostList = ({ posts, emptyLabel, section, onResponded, onError }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / POST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPosts = posts.slice((currentPage - 1) * POST_PAGE_SIZE, currentPage * POST_PAGE_SIZE);

  return (
    <div>
      <div className="space-y-2">
        {posts.length === 0 && <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">{emptyLabel}</p>}
        {pagedPosts.map((post) => (
          <PostCard key={post._id} post={post} section={section} onResponded={onResponded} onError={onError} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} · {posts.length} message{posts.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const TeamPosts = ({ section, fixedDivision = null }) => {
  const [divisions, setDivisions] = useState(fixedDivision ? [fixedDivision] : []);
  const [divisionId, setDivisionId] = useState(fixedDivision?._id || "");
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (fixedDivision) {
      setDivisions([fixedDivision]);
      setDivisionId(fixedDivision._id);
      return;
    }
    let cancelled = false;
    Promise.all([
      apiGet("/api/divisions"),
      apiGet(`/api/team-posts/notifications?section=${section}`),
    ])
      .then(([divisionData, notificationData]) => {
        if (cancelled) return;
        const available = divisionData.divisions || [];
        setDivisions(available);
        if (available.length) {
          const selected = available.find((division) => notificationData.byDivision?.[division._id]) || available[0];
          setDivisionId(selected._id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fixedDivision, section]);

  const receivePosts = useCallback((nextPosts, currentDivisionId) => {
    setPosts(nextPosts);
    const unread = nextPosts.filter((post) => post.unread);
    if (unread.length) {
      const incoming = unread.filter((post) => post.direction === "received").length;
      const responses = unread.length - incoming;
      const parts = [];
      if (incoming) parts.push(`${incoming} new post${incoming === 1 ? "" : "s"}`);
      if (responses) parts.push(`${responses} new response${responses === 1 ? "" : "s"}`);
      setNotice(`${parts.join(" and ")} for this division.`);
      apiPost("/api/team-posts/acknowledge", { division: currentDivisionId, section })
        .then(() => window.dispatchEvent(new Event(TEAM_POST_UPDATED_EVENT)))
        .catch(() => {});
    }
  }, [section]);

  const loadPosts = useCallback((showLoading = false) => {
    if (!divisionId) return;
    if (showLoading) setLoading(true);
    apiGet(`/api/team-posts?division=${divisionId}&section=${section}`)
      .then((data) => receivePosts(data.posts || [], divisionId))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId, receivePosts, section]);

  useEffect(() => {
    setPosts([]);
    setNotice("");
    loadPosts(true);
  }, [loadPosts]);

  useEffect(() => {
    if (!divisionId) return undefined;
    const interval = window.setInterval(() => loadPosts(false), 30_000);
    const refresh = () => loadPosts(false);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [divisionId, loadPosts]);

  const sentPosts = useMemo(() => posts.filter((post) => post.direction === "sent"), [posts]);
  const receivedPosts = useMemo(() => posts.filter((post) => post.direction === "received"), [posts]);
  const receivedUnreadCount = useMemo(() => receivedPosts.filter((post) => post.unread).length, [receivedPosts]);
  const sentUnreadCount = useMemo(() => sentPosts.filter((post) => post.unread).length, [sentPosts]);

  const activePosts = activeTab === "received" ? receivedPosts : sentPosts;

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activePosts.filter((post) => {
      if (statusFilter === "unread" && !post.unread) return false;
      if (statusFilter === "requested" && !(post.responseRequested && post.status !== "responded")) return false;
      if (statusFilter === "responded" && post.status !== "responded") return false;
      if (!query) return true;
      const haystack = [
        post.title,
        post.body,
        post.purpose,
        post.responseBody,
        formatPostPerson(post, "sent"),
        formatPostPerson(post, "responded"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activePosts, search, statusFilter]);

  const submitPost = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiPost("/api/team-posts", {
        division: divisionId,
        fromSection: section,
        ...form,
      });
      setPosts((current) => [data.post, ...current]);
      setForm(EMPTY_FORM);
      setSuccess(`Post sent to ${POST_SECTION_LABELS[data.post.toSection]}.`);
      window.dispatchEvent(new Event(TEAM_POST_UPDATED_EVENT));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const responded = (updated, message) => {
    setPosts((current) => current.map((post) => post._id === updated._id ? updated : post));
    setSuccess(message);
    window.dispatchEvent(new Event(TEAM_POST_UPDATED_EVENT));
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Posts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Send a division update from {POST_SECTION_LABELS[section]} to {POST_SECTION_LABELS[section === "deployment" ? "network_success" : "deployment"]} and request a response when one is needed.
        </p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      {notice && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="font-medium text-blue-700 hover:text-blue-900">Dismiss</button>
        </div>
      )}

      {loading ? <p className="text-sm text-slate-500">Loading posts…</p> : (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveTab("received")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "received" ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Received
                {receivedUnreadCount > 0 && (
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${activeTab === "received" ? "bg-white/25 text-white" : "bg-red-600 text-white"}`}>
                    {receivedUnreadCount > 99 ? "99+" : receivedUnreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sent")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "sent" ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Sent &amp; responses
                {sentUnreadCount > 0 && (
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${activeTab === "sent" ? "bg-white/25 text-white" : "bg-red-600 text-white"}`}>
                    {sentUnreadCount > 99 ? "99+" : sentUnreadCount}
                  </span>
                )}
              </button>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, message, purpose, or person…"
              className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All statuses</option>
              <option value="unread">Unread</option>
              <option value="requested">Needs response</option>
              <option value="responded">Responded</option>
            </select>
          </div>

          <PostList
            key={`${activeTab}-${search}-${statusFilter}-${divisionId}`}
            posts={filteredPosts}
            emptyLabel={
              search.trim() || statusFilter !== "all"
                ? "No messages match your search or filter."
                : activeTab === "received"
                  ? "No posts received for this division."
                  : "No posts sent for this division."
            }
            section={section}
            onResponded={responded}
            onError={setError}
          />
        </section>
      )}

      <form onSubmit={submitPost} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Make a post</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Division
            <select
              value={divisionId}
              onChange={(event) => setDivisionId(event.target.value)}
              disabled={Boolean(fixedDivision)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100"
            >
              {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Purpose
            <input
              value={form.purpose}
              onChange={(event) => setForm({ ...form, purpose: event.target.value })}
              maxLength={80}
              required
              placeholder="Reason for this post"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={100}
              required
              placeholder="Short post title"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Body
            <textarea
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              maxLength={120}
              required
              rows={3}
              placeholder="Write the update in 120 characters or fewer"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-400">{form.body.length}/120 characters</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.responseRequested}
              onChange={(event) => setForm({ ...form, responseRequested: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Request a response
          </label>
          <button
            type="submit"
            disabled={submitting || !divisionId}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamPosts;
