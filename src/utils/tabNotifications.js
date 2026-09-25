const BASE_TITLE = typeof document !== "undefined" ? document.title : "COMPASS | Big Star Transit LLC";
const BASE_FAVICON =
  (typeof document !== "undefined" && document.querySelector('link[rel="icon"]')?.getAttribute("href")) ||
  "/logo.png";

const counts = new Map();
let faviconImage = null;

const getFaviconLink = () => {
  if (typeof document === "undefined") return null;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
};

const applyTitle = (total) => {
  if (typeof document === "undefined") return;
  document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${BASE_TITLE}` : BASE_TITLE;
};

const drawFaviconBadge = (link, total) => {
  try {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (faviconImage.complete && faviconImage.naturalWidth) {
      ctx.drawImage(faviconImage, 0, 0, size, size);
    }
    const label = total > 99 ? "99+" : String(total);
    const radius = label.length > 2 ? 20 : 16;
    const cx = size - radius - 2;
    const cy = radius + 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `${label.length > 2 ? 22 : 28}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy + 1);
    link.href = canvas.toDataURL("image/png");
  } catch {
    // Canvas unsupported/tainted: the title badge still carries the count.
  }
};

const applyFavicon = (total) => {
  const link = getFaviconLink();
  if (!link) return;
  if (total <= 0) {
    link.href = BASE_FAVICON;
    return;
  }
  if (!faviconImage) {
    faviconImage = new Image();
    faviconImage.src = BASE_FAVICON;
  }
  if (faviconImage.complete) drawFaviconBadge(link, total);
  else faviconImage.onload = () => drawFaviconBadge(link, total);
};

const recompute = () => {
  let total = 0;
  counts.forEach((value) => {
    total += value;
  });
  applyTitle(total);
  applyFavicon(total);
};

// Combines counts from multiple sources (e.g. pending requests + unread posts)
// into one badge on the tab title and favicon so it stays correct when either changes.
export const setTabNotificationCount = (key, count) => {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  if (safeCount === 0) counts.delete(key);
  else counts.set(key, safeCount);
  recompute();
};

export const clearTabNotificationCount = (key) => {
  counts.delete(key);
  recompute();
};
