import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

/* ---------------------------------------------------------------- config */

const API_URL = "http://127.0.0.1:8000"; // your FastAPI backend

const CATEGORIES = [
  "All",
  "Nature",
  "Anime",
  "Minimal",
  "Gaming",
  "City",
  "Abstract",
  "Technology",
];

// "value" is what gets sent to the backend (it understands these presets)
const RESOLUTIONS = [
  { value: "hd", label: "HD", hint: "1280×720" },
  { value: "1080p", label: "1080p", hint: "1920×1080" },
  { value: "2k", label: "2K", hint: "2560×1440" },
  { value: "4k", label: "4K", hint: "3840×2160" },
];

const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "search" },
  { id: "mine", label: "My Wallpapers", icon: "image" },
  { id: "collections", label: "Collections", icon: "bookmark" },
  { id: "settings", label: "Settings", icon: "gear" },
];

/* ----------------------------------------------------------------- icons */

const ICONS = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4",
  image:
    "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a.5.5 0 1 0 0 .01",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  gear: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9a7.5 7.5 0 0 0 1.7 1L11 21h4l.4-2.9a7.5 7.5 0 0 0 1.7-1l2.3.9 2-3.5z",
  heart:
    "M12 20s-7-4.4-9-9.2C1.8 7.6 4 5 6.8 5c1.9 0 3.5 1 5.2 3 1.7-2 3.3-3 5.2-3C20 5 22.2 7.6 21 10.8 19 15.6 12 20 12 20z",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  close: "M6 6l12 12M18 6L6 18",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  logo: "M3 19l6-10 4 6 2.5-4L21 19z",
};

function Icon({ name, size = 18, fill = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* --------------------------------------------------------------- helpers */

const tauriInvoke = (cmd, args) => {
  const inv = window.__TAURI_INTERNALS__?.invoke;
  return inv ? inv(cmd, args) : null;
};
const inTauri = () => Boolean(window.__TAURI_INTERNALS__);

const warmed = new Set();
function warm(url) {
  if (!url || warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage can be unavailable */
    }
  }, [key, value]);
  return [value, setValue];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

async function fetchWallpapers({ theme, resolutions, signal }) {
  const params = new URLSearchParams();
  params.set("theme", theme);
  // repeated key: ?resolutions=1080p&resolutions=4k (matches list[str] Query)
  resolutions.forEach((r) => params.append("resolutions", r));

  const res = await fetch(`${API_URL}/?${params.toString()}`, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Backend returned ${res.status}`);
  }
  const data = await res.json();
  return data.images ?? [];
}

/* ------------------------------------------------------------ components */

function TitleBar({ query, setQuery, onSubmit }) {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Icon name="search" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wallpapers, tags or creators..."
          aria-label="Search wallpapers"
        />
      </form>
    </header>
  );
}

function Sidebar({ page, setPage, savedCount }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="logo" size={18} fill />
        </span>
        <span>Walli</span>
      </div>
      <nav>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
            aria-current={page === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.id === "mine" && savedCount > 0 && (
              <span className="badge">{savedCount}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function ResolutionFilter({ selected, setSelected }) {
  const toggle = (value) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        // backend rejects an empty selection, so keep at least one
        return prev.length === 1 ? prev : prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  };
  return (
    <div className="res-filter" role="group" aria-label="Resolution filter">
      <span className="res-label">
        <Icon name="monitor" size={15} />
        Resolution
      </span>
      {RESOLUTIONS.map((r) => (
        <button
          key={r.value}
          className={`res-chip ${selected.includes(r.value) ? "on" : ""}`}
          onClick={() => toggle(r.value)}
          aria-pressed={selected.includes(r.value)}
          title={r.hint}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function Card({ image, saved, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const timers = useRef([]);

  // start downloading the preview while the pointer rests on the card
  const startWarm = () => {
    timers.current = [
      setTimeout(() => warm(image.url), 350),
    ];
  };
  const stopWarm = () => timers.current.forEach(clearTimeout);

  return (
    <button
      className={`card ${loaded ? "loaded" : ""}`}
      onClick={() => onOpen(image)}
      onMouseEnter={startWarm}
      onMouseLeave={stopWarm}
      onFocus={startWarm}
      onBlur={stopWarm}
      aria-label={`Open wallpaper ${image.id}`}
    >
      <img
        src={image["thumbnail-large"]}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
      <span className="card-meta">
        <span>{image.resolution}</span>
        {saved && (
          <span className="card-saved">
            <Icon name="heart" size={13} fill />
          </span>
        )}
      </span>
    </button>
  );
}

function Skeletons() {
  return Array.from({ length: 9 }).map((_, i) => (
    <div className="card skeleton" key={i} />
  ));
}

function Modal({ image, saved, onClose, onSave, onApply, applying }) {
  const [fullLoaded, setFullLoaded] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Wallpaper preview"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`preview ${fullLoaded ? "loaded" : ""}`}>
          <img
            className="preview-thumb"
            src={image["thumbnail-large"]}
            alt=""
          />
          <img
            className="preview-full"
            src={image.url}
            alt={`Wallpaper ${image.id}`}
            onLoad={() => setFullLoaded(true)}
          />
        </div>
        <div className="modal-bar">
          <div className="modal-info">
            <strong>{image.resolution}</strong>
            <span className="muted">Wallhaven · {image.id}</span>
          </div>
          <div className="modal-actions">
            <button
              className={`btn ghost ${saved ? "is-saved" : ""}`}
              onClick={() => onSave(image)}
            >
              <Icon name={saved ? "check" : "heart"} size={16} />
              {saved ? "Saved" : "Save"}
            </button>
            <button
              className="btn primary"
              onClick={() => onApply(image)}
              disabled={applying}
            >
              <Icon name="monitor" size={16} />
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
        <button
          ref={closeRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind}`} role="status">
      {toast.text}
    </div>
  );
}

function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="btn ghost" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ app */

function App() {
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [resolutions, setResolutions] = usePersistentState("walli.res", [
    "1080p",
  ]);
  const [saved, setSaved] = usePersistentState("walli.saved", []);
  const [apiUrlDraft] = useState(API_URL);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);

  const showToast = useCallback((text, kind = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // The theme sent to the backend: a typed search wins over the category chip
  const theme = activeSearch.trim() || category;
  const needsFetch = page === "home" || page === "explore";

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // small debounce so rapid filter toggling sends one request
    const t = setTimeout(() => {
      fetchWallpapers({ theme, resolutions, signal: controller.signal })
        .then((list) => {
          setImages(list);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setError(err.message);
          setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [theme, resolutions, refreshKey, needsFetch]);

  const submitSearch = () => {
    setActiveSearch(query);
    if (page !== "explore") setPage("explore");
  };

  const toggleSave = (image) => {
    setSaved((prev) => {
      if (prev.some((s) => s.id === image.id)) {
        showToast("Removed from My Wallpapers", "info");
        return prev.filter((s) => s.id !== image.id);
      }
      showToast("Saved to My Wallpapers");
      return [image, ...prev];
    });
  };

  const applyWallpaper = async (image) => {
    setApplying(true);
    try {
      if (inTauri()) {
        // implement this command in src-tauri (download image + set wallpaper)
        await tauriInvoke("apply_wallpaper", {
          url: image.url,
          id: image.id,
        });
        showToast("Wallpaper applied");
      } else {
        showToast("Apply works in the desktop app", "info");
      }
    } catch (err) {
      showToast(`Couldn't apply: ${err?.message || err}`, "error");
    } finally {
      setApplying(false);
    }
  };

  const showFilters = needsFetch;

  let title = `${greeting()}`;
  let subtitle = "Discover beautiful wallpapers from the community.";
  if (page === "explore") {
    title = activeSearch ? `Results for “${activeSearch}”` : "Explore";
    subtitle = "Random picks that match your theme and resolution.";
  } else if (page === "mine") {
    title = "My Wallpapers";
    subtitle = "Wallpapers you've saved.";
  } else if (page === "collections") {
    title = "Collections";
    subtitle = "Group wallpapers into sets.";
  } else if (page === "settings") {
    title = "Settings";
    subtitle = "Backend and defaults.";
  }

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} savedCount={saved.length} />

      <div className="main">
        <TitleBar
          query={query}
          setQuery={setQuery}
          onSubmit={submitSearch}
        />

        <main className="content">
          <div className="page-head">
            <div>
              <h1>{title}</h1>
              <p className="muted">{subtitle}</p>
            </div>
            {needsFetch && (
              <button
                className="btn ghost icon-only"
                onClick={() => setRefreshKey((k) => k + 1)}
                aria-label="Shuffle wallpapers"
                title="Shuffle"
              >
                <Icon name="refresh" size={16} />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="filters">
              <div className="chips" role="group" aria-label="Category">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${
                      !activeSearch && category === c ? "active" : ""
                    }`}
                    onClick={() => {
                      setCategory(c);
                      setActiveSearch("");
                      setQuery("");
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <ResolutionFilter
                selected={resolutions}
                setSelected={setResolutions}
              />
            </div>
          )}

          {needsFetch && (
            <>
              {error ? (
                <EmptyState
                  title="Couldn't load wallpapers"
                  text={`${error}. Make sure the backend is running at ${apiUrlDraft}.`}
                  action="Try again"
                  onAction={() => setRefreshKey((k) => k + 1)}
                />
              ) : (
                <div className="grid">
                  {loading ? (
                    <Skeletons />
                  ) : images.length ? (
                    images.map((img) => (
                      <Card
                        key={img.id}
                        image={img}
                        saved={savedIds.has(img.id)}
                        onOpen={setSelected}
                      />
                    ))
                  ) : null}
                </div>
              )}
              {!loading && !error && images.length === 0 && (
                <EmptyState
                  title="No wallpapers found"
                  text="Try another theme or add more resolutions."
                />
              )}
            </>
          )}

          {page === "mine" &&
            (saved.length ? (
              <div className="grid">
                {saved.map((img) => (
                  <Card
                    key={img.id}
                    image={img}
                    saved
                    onOpen={setSelected}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing saved yet"
                text="Open a wallpaper and choose Save to keep it here."
                action="Browse wallpapers"
                onAction={() => setPage("home")}
              />
            ))}

          {page === "collections" && (
            <EmptyState
              title="No collections yet"
              text="Collections are coming soon. Saved wallpapers live in My Wallpapers for now."
              action="Open My Wallpapers"
              onAction={() => setPage("mine")}
            />
          )}

          {page === "settings" && (
            <div className="settings">
              <div className="setting-row">
                <div>
                  <strong>Backend URL</strong>
                  <p className="muted">Set in app.jsx (API_URL).</p>
                </div>
                <code>{API_URL}</code>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Default resolutions</strong>
                  <p className="muted">Change them from the filter on Home.</p>
                </div>
                <code>{resolutions.join(", ")}</code>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Clear saved wallpapers</strong>
                  <p className="muted">Removes everything in My Wallpapers.</p>
                </div>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setSaved([]);
                    showToast("Saved wallpapers cleared", "info");
                  }}
                  disabled={!saved.length}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {selected && (
        <Modal
          image={selected}
          saved={savedIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onSave={toggleSave}
          onApply={applyWallpaper}
          applying={applying}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
