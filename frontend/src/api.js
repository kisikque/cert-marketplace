const API_BASE = "http://localhost:3001/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

export async function apiUpload(path, formData, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "POST",
    credentials: "include",
    body: formData,
    headers: options.headers,
    ...options
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}
