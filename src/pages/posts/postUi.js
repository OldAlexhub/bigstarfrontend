export const TEAM_POST_UPDATED_EVENT = "bigstar:team-post-updated";

export const POST_SECTION_LABELS = {
  network_success: "Network Success",
  deployment: "Deployment",
};

export const formatPostPerson = (post, kind) => {
  const populated = post[`${kind}By`];
  const name = populated?.name || post[`${kind}ByName`] || "";
  const username = populated?.username || post[`${kind}ByUsername`] || "";
  if (name && username) return `${name} (${username})`;
  return name || username || "—";
};

export const formatPostDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");
