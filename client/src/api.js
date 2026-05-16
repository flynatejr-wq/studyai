const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

function getToken() {
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
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}). Please try again.`);
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// Auth
export const api = {
  auth: {
    signup: (body) => request("/auth/signup", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
    login: (body) => request("/auth/login", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
    me: () => request("/auth/me", { headers: headers() }),
  },
  summarize: {
    text: (transcript) => request("/summarize", { method: "POST", headers: headers(), body: JSON.stringify({ transcript }) }),
    image: (file) => {
      const fd = new FormData(); fd.append("image", file);
      return request("/summarize/image", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
    },
    audio: (file) => {
      const fd = new FormData(); fd.append("audio", file);
      return request("/summarize/audio", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
    },
    file: (file) => {
      const fd = new FormData(); fd.append("file", file);
      return request("/summarize/file", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
    },
  },
  folders: {
    list: () => request("/folders", { headers: headers() }),
    create: (body) => request("/folders", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
    update: (id, body) => request(`/folders/${id}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) }),
    delete: (id) => request(`/folders/${id}`, { method: "DELETE", headers: headers() }),
  },
  guides: {
    list: (folder_id) => request(`/guides${folder_id ? `?folder_id=${folder_id}` : ""}`, { headers: headers() }),
    get: (id) => request(`/guides/${id}`, { headers: headers() }),
    save: (body) => request("/guides", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
    move: (id, folder_id) => request(`/guides/${id}/move`, { method: "PATCH", headers: headers(), body: JSON.stringify({ folder_id }) }),
    delete: (id) => request(`/guides/${id}`, { method: "DELETE", headers: headers() }),
    submitQuiz: (id, score, total) => request(`/guides/${id}/quiz`, { method: "POST", headers: headers(), body: JSON.stringify({ score, total }) }),
    generateQuiz: (id, count) => request(`/guides/${id}/generate-quiz`, { method: "POST", headers: headers(), body: JSON.stringify({ count }) }),
  },
  chat: {
    history: (guideId) => request(`/chat/${guideId}`, { headers: headers() }),
    send: (guideId, message) => request(`/chat/${guideId}`, { method: "POST", headers: headers(), body: JSON.stringify({ message }) }),
    clear: (guideId) => request(`/chat/${guideId}`, { method: "DELETE", headers: headers() }),
  },
};
