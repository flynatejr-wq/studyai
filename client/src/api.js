import { getFingerprintSync } from "./lib/fingerprint.js";

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export function getToken() {
  return localStorage.getItem("token");
}

function headers(extra = {}) {
  const token = getToken();
  const fp    = getFingerprintSync(); // non-null once the SubtleCrypto promise resolves (~5ms)
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fp    ? { "X-Client-FP": fp }               : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  // Handle rate limiting before trying to parse
  if (res.status === 429) {
    throw new Error("Too many requests. Please wait a moment and try again.");
  }

  // Handle auth errors immediately
  if (res.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g. Railway/Express plain-text error page)
    if (res.status >= 500) throw new Error("The server encountered an error. Please try again in a moment.");
    if (res.status === 404) throw new Error("The requested resource was not found.");
    if (res.status === 405) throw new Error("This action is not supported. Please refresh and try again.");
    throw new Error(`Unexpected server response (${res.status}). Please try again.`);
  }

  if (!res.ok) {
    // Propagate structured error codes (e.g. FREE_LIMIT_GUIDES) so callers can
    // show the upgrade modal instead of a generic error message.
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  auth: {
    signup:         (body) => request("/auth/signup",         { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    login:          (body) => request("/auth/login",          { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    me:             ()     => request("/auth/me",              { headers: headers() }),
    updateProfile:  (body) => request("/auth/profile",        { method: "PUT",    headers: headers(), body: JSON.stringify(body) }),
    changeEmail:    (body) => request("/auth/email",          { method: "PUT",    headers: headers(), body: JSON.stringify(body) }),
    deleteAccount:  (body) => request("/auth/account",        { method: "DELETE", headers: headers(), body: JSON.stringify(body) }),
    forgotPassword:  (body)  => request("/auth/forgot-password",  { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    resetPassword:   (body)  => request("/auth/reset-password",   { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    verifyEmail:     (token) => request(`/auth/verify-email?token=${encodeURIComponent(token)}`),
    resendVerification: ()   => request("/auth/resend-verification", { method: "POST", headers: headers() }),
  },
  summarize: {
    text:    (transcript, difficulty = "standard", style = "detailed") => request("/summarize", { method: "POST", headers: headers(), body: JSON.stringify({ transcript, difficulty, style }) }),
    youtube: (url, difficulty = "standard", style = "detailed") => request("/summarize/youtube", { method: "POST", headers: headers(), body: JSON.stringify({ url, difficulty, style }) }),
    image:   (file, difficulty = "standard", style = "detailed") => { const fd = new FormData(); fd.append("image", file); fd.append("difficulty", difficulty); fd.append("style", style); const tok = getToken(); const fp = getFingerprintSync(); const h = {}; if (tok) h.Authorization = `Bearer ${tok}`; if (fp) h["X-Client-FP"] = fp; return request("/summarize/image", { method: "POST", headers: h, body: fd }); },
    audio:   (file, difficulty = "standard", style = "detailed") => { const fd = new FormData(); fd.append("audio", file); fd.append("difficulty", difficulty); fd.append("style", style); const tok = getToken(); const fp = getFingerprintSync(); const h = {}; if (tok) h.Authorization = `Bearer ${tok}`; if (fp) h["X-Client-FP"] = fp; return request("/summarize/audio", { method: "POST", headers: h, body: fd }); },
    file:    (file, difficulty = "standard", style = "detailed") => { const fd = new FormData(); fd.append("file",  file); fd.append("difficulty", difficulty); fd.append("style", style); const tok = getToken(); const fp = getFingerprintSync(); const h = {}; if (tok) h.Authorization = `Bearer ${tok}`; if (fp) h["X-Client-FP"] = fp; return request("/summarize/file",  { method: "POST", headers: h, body: fd }); },
  },
  folders: {
    list:   ()         => request("/folders",      { headers: headers() }),
    create: (body)     => request("/folders",      { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    update: (id, body) => request(`/folders/${id}`,{ method: "PATCH",  headers: headers(), body: JSON.stringify(body) }),
    delete: (id)       => request(`/folders/${id}`,{ method: "DELETE", headers: headers() }),
  },
  guides: {
    // Legacy (returns array) — used by Dashboard, FolderView
    list:         (folder_id)          => request(`/guides${folder_id ? `?folder_id=${folder_id}` : ""}`, { headers: headers() }),
    // Paginated + searchable — used by AllGuides
    listPaged:    (offset = 0, search = "") => request(`/guides?limit=24&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ""}`, { headers: headers() }),
    get:          (id)                 => request(`/guides/${id}`, { headers: headers() }),
    save:         (body)               => request("/guides",           { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    move:         (id, folder_id)      => request(`/guides/${id}/move`,{ method: "PATCH",  headers: headers(), body: JSON.stringify({ folder_id }) }),
    delete:       (id)                 => request(`/guides/${id}`,     { method: "DELETE", headers: headers() }),
    submitQuiz:   (id, score, total)   => request(`/guides/${id}/quiz`,{ method: "POST",   headers: headers(), body: JSON.stringify({ score, total }) }),
    generateQuiz: (id, count, mode = "self-grade") => request(`/guides/${id}/generate-quiz`, { method: "POST", headers: headers(), body: JSON.stringify({ count, mode }) }),
    quizHistory:  (id)                 => request(`/guides/${id}/quiz-history`, { headers: headers() }),
    logSession:   (id, duration_seconds) => request(`/guides/${id}/session`, { method: "POST", headers: headers(), body: JSON.stringify({ duration_seconds }) }),
    share:        (id)                 => request(`/guides/${id}/share`, { method: "POST",   headers: headers() }),
    revokeShare:          (id)              => request(`/guides/${id}/share`,             { method: "DELETE", headers: headers() }),
    updateSectionProgress:(id, progress)   => request(`/guides/${id}/section-progress`,  { method: "PATCH",  headers: headers(), body: JSON.stringify({ progress }) }),
    toggleFavorite:       (id)             => request(`/guides/${id}/favorite`,           { method: "PATCH",  headers: headers() }),
  },
  chat: {
    history: (guideId)          => request(`/chat/${guideId}`, { headers: headers() }),
    send:    (guideId, message) => request(`/chat/${guideId}`, { method: "POST",   headers: headers(), body: JSON.stringify({ message }) }),
    clear:   (guideId)          => request(`/chat/${guideId}`, { method: "DELETE", headers: headers() }),
  },
  progress: {
    get:    () => request("/progress",        { headers: headers() }),
    limits: () => request("/progress/limits", { headers: headers() }),
  },
  public: {
    getGuide: (token) => request(`/public/guide/${token}`),
  },
  referrals: {
    get:    ()  => request("/referrals",        { headers: headers() }),
    redeem: ()  => request("/referrals/redeem", { method: "POST", headers: headers() }),
  },
  studyPlans: {
    list:   ()         => request("/study-plans",      { headers: headers() }),
    create: (body)     => request("/study-plans",      { method: "POST",  headers: headers(), body: JSON.stringify(body) }),
    update: (id, body) => request(`/study-plans/${id}`,{ method: "PATCH", headers: headers(), body: JSON.stringify(body) }),
    delete: (id)       => request(`/study-plans/${id}`,{ method: "DELETE",headers: headers() }),
  },
  export: {
    download: () => {
      // Returns raw JSON blob — handled with fetch directly so we can trigger a download
      const token = getToken();
      return fetch(`${BASE}/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    },
  },
  stripe: {
    checkout: () => request("/stripe/checkout", { method: "POST", headers: headers() }),
    portal:   () => request("/stripe/portal",   { method: "POST", headers: headers() }),
  },
  admin: {
    setup:       (body)         => request("/admin/setup",              { method: "POST",  headers: headers(), body: JSON.stringify(body) }),
    stats:       ()             => request("/admin/stats",              { headers: headers() }),
    users:       (params = {})  => request(`/admin/users?${new URLSearchParams(params)}`, { headers: headers() }),
    getUser:     (id)           => request(`/admin/users/${id}`,        { headers: headers() }),
    updateUser:  (id, body)     => request(`/admin/users/${id}`,        { method: "PATCH", headers: headers(), body: JSON.stringify(body) }),
    resetLimits: (id)           => request(`/admin/users/${id}/reset-limits`, { method: "POST", headers: headers() }),
    auditLogs:   (params = {})  => request(`/admin/audit-logs?${new URLSearchParams(params)}`, { headers: headers() }),
    abuse: {
      stats:           ()               => request("/admin/abuse/stats",             { headers: headers() }),
      deletedAccounts: (params = {})    => request(`/admin/abuse/deleted-accounts?${new URLSearchParams(params)}`, { headers: headers() }),
      signals:         (params = {})    => request(`/admin/abuse/signals?${new URLSearchParams(params)}`,          { headers: headers() }),
      blockSignal:     (id, block)      => request(`/admin/abuse/signals/${id}/block`, { method: "PATCH", headers: headers(), body: JSON.stringify({ block }) }),
      flags:           (params = {})    => request(`/admin/abuse/flags?${new URLSearchParams(params)}`,            { headers: headers() }),
      resolveFlag:     (id, notes = "") => request(`/admin/abuse/flags/${id}/resolve`, { method: "POST",  headers: headers(), body: JSON.stringify({ notes }) }),
      raiseFlag:       (body)           => request("/admin/abuse/flags",               { method: "POST",  headers: headers(), body: JSON.stringify(body) }),
    },
  },
};
