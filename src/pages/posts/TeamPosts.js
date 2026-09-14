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
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${post.unread ? "border-brand-300 ring-1 ring-brand-100" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{post.purpose}</span>
            {post.unread && <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">New</span>}
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${post.responseRequested ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
              {post.responseRequested ? (post.status === "responded" ? "Response received" : "Response requested") : "Information only"}
            </span>
          </div>
          <h4 className="mt-2 text-base font-semibold text-slate-900">{post.title}</h4>
        </div>
        <span className="text-xs text-slate-400">{formatPostDateTime(post.createdAt)}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{post.body}</p>
      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        Sent by <span className="font-medium text-slate-700">{formatPostPerson(post, "sent")}</span> from {senderTeam} to {recipientTeam} on {formatPostDateTime(post.createdAt)}.
      </div>

      {post.status === "responded" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-900">{post.responseBody}</p>
          <p className="mt-2 text-xs text-emerald-700">
            Responded by <span className="font-medium">{formatPostPerson(post, "responded")}</span> on {formatPostDateTime(post.respondedAt)}.
          </p>
        </div>
      )}

      {incoming && post.responseRequested && post.status === "sent" && (
        <ResponseEditor post={post} section={section} onResponded={onResponded} onError={onError} />
      )}
    </article>
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

      <form onSubmit={submitPost} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

      {loading ? <p className="text-sm text-slate-500">Loading posts…</p> : (
        <div className="grid gap-8 xl:grid-cols-2">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
              Received
              {receivedPosts.some((post) => post.unread) && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">New</span>}
            </h3>
            <div className="space-y-3">
              {receivedPosts.length === 0 && <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">No posts received for this division.</p>}
              {receivedPosts.map((post) => <PostCard key={post._id} post={post} section={section} onResponded={responded} onError={setError} />)}
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Sent &amp; response history</h3>
            <div className="space-y-3">
              {sentPosts.length === 0 && <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">No posts sent for this division.</p>}
              {sentPosts.map((post) => <PostCard key={post._id} post={post} section={section} onResponded={responded} onError={setError} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default TeamPosts;
