import { API_URL } from "../constants/appConstants";

// FastAPI "detail" is a string for HTTPException, a list for validation errors
export function readDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "";
}

export async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Can't reach the backend");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = readDetail((await res.json()).detail);
    } catch {
      /* not json */
    }
    throw new Error(detail || `Backend returned ${res.status}`);
  }
  return res.json();
}

export const jsonBody = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// GET /health -> { status: "ok" } (with GET /saved fallback for legacy sidecar)
export async function checkHealth(signal) {
  try {
    const res = await fetch(`${API_URL}/health`, { signal });
    if (res.ok) return true;
    if (res.status === 404) {
      const fallback = await fetch(`${API_URL}/saved`, { signal });
      if (fallback.ok) {
        const data = await fallback.json().catch(() => null);
        return Boolean(data && Array.isArray(data.images));
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Polls /health up to maxAttempts with intervalMs delay to handle sidecar startup lag
export async function waitForBackend({ maxAttempts = 10, intervalMs = 300, signal } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) return false;
    const ok = await checkHealth(signal);
    if (ok) return true;
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

// GET /?theme=...&resolutions=1080p&resolutions=4k
export async function fetchWallpapers({ theme, resolutions, signal }) {
  const params = new URLSearchParams({ theme });
  resolutions.forEach((r) => params.append("resolutions", r));
  const data = await request(`/?${params}`, { signal });
  return data.images ?? [];
}

// POST /apply  { url }  ->  { status: "applied" | "failed" }
export async function applyWallpaper(url) {
  const data = await request("/apply", jsonBody("POST", { url }));
  if (data.status !== "applied") throw new Error("Windows rejected the wallpaper");
}

// GET /saved     -> { images: [...] }
// POST /saved    (full image object)  -> { images: [...] }
// DELETE /saved  { id }               -> { images: [...] }
// Every call returns the whole saved list, so the backend stays the source of truth.
export const fetchSaved = async () => (await request("/saved")).images ?? [];
export const saveRemote = async (image) => (await request("/saved", jsonBody("POST", image))).images ?? [];
export const removeRemote = async (id) => (await request("/saved", jsonBody("DELETE", { id }))).images ?? [];
