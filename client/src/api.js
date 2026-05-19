const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export function getToken() {
  return localStorage.getItem("token");
}

function headers(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const api = {
  auth: {
    signup:         (body) => request("/auth/signup",         { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    login:          (body) => request("/auth/login",          { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    me:             ()     => request("/auth/me",              { headers: headers() }),
    updateProfile:  (body) => request("/auth/profile",        { method: "PUT",    headers: headers(), body: JSON.stringify(body) }),
    deleteAccount:  (body) => request("/auth/account",        { method: "DELETE", headers: headers(), body: JSON.stringify(body) }),
    forgotPassword: (body) => request("/auth/forgot-password",{ method: "POST",   headers: headers(), body: JSON.stringify(body) }),
    resetPassword:  (body) => request("/auth/reset-password", { method: "POST",   headers: headers(), body: JSON.stringify(body) }),
  },
  summarize: {
    text:    (transcript, difficulty = "standard") => request("/summarize", { method: "POST", headers: headers(), body: JSON.stringify({ transcript, difficulty }) }),
    youtube: (url, difficulty = "standard") => request("/summarize/youtube", { method: "POST", headers: headers(), body: JSON.stringify({ url, difficulty }) }),
    image:   (file, difficulty = "standard") => { const fd = new FormData(); fd.append("image", file); fd.append("difficulty", difficulty); return request("/summarize/image", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd }); },
    audio:   (file, difficulty = "standard") => { const fd = new FormData(); fd.append("audio", file); fd.append("difficulty", difficulty); return request("/summarize/audio", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd }); },
    file:    (file, difficulty = "standard") => { const fd = new FormData(); fd.append("file",  file); fd.append("difficulty", difficulty); return request("/summarize/file",  { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd }); },
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
  },
  chat: {
    history: (guideId)          => request(`/chat/${guideId}`, { headers: headers() }),
    send:    (guideId, message) => request(`/chat/${guideId}`, { method: "POST",   headers: headers(), body: JSON.stringify({ message }) }),
    clear:   (guideId)          => request(`/chat/${guideId}`, { method: "DELETE", headers: headers() }),
  },
  progress: {
    get: () => request("/progress", { headers: headers() }),
  },
  public: {
    getGuide: (token) => request(`/public/guide/${token}`),
  },
};
