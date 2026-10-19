import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/* ---------------------------------------------------------------- config */

const API_URL = "http://127.0.0.1:8000"; // FastAPI backend (home.py)

const CATEGORIES = ["All", "Nature", "Anime", "Minimal", "Gaming", "City", "Abstract", "Technology"];

// value = what the backend understands (RESOLUTION_PRESETS in home.py)
const RESOLUTIONS = [
  { value: "hd", label: "HD", hint: "1280×720" },
  { value: "1080p", label: "1080p", hint: "1920×1080" },
  { value: "2k", label: "2K", hint: "2560×1440" },
  { value: "4k", label: "4K", hint: "3840×2160" },
];

const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "mine", label: "Saved Wallpapers", icon: "image" },
  { id: "collections", label: "Collections", icon: "grid" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

const ICONS = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  sliders: "M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4",
  heart: "M12 20s-7-4.4-9-9.2C1.8 7.6 4 5 6.8 5c1.9 0 3.5 1 5.2 3 1.7-2 3.3-3 5.2-3C20 5 22.2 7.6 21 10.8 19 15.6 12 20 12 20z",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  shuffle: "M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  logo: "M3 19l6-10 4 6 2.5-4L21 19z",
  power: "M12 3v8M7 6.5a7 7 0 1 0 10 0",
  server: "M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01",
  pulse: "M3 12h4l3-7 4 14 3-7h4",
};

function Icon({ name, size = 18, fill = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* --------------------------------------------------------------- helpers */

const warmed = new Set();
function warm(url) {
  if (!url || warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

// The preview uses the mid-size thumbnail, not the multi-MB original.
// (Apply still downloads the full file on the backend.)
const previewSrc = (image) => image["thumbnail-original"] || image["thumbnail-large"] || image.url;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// FastAPI "detail" is a string for HTTPException, a list for validation errors
function readDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "";
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Can't reach the backend");
  }
  if (!res.ok) {
    let detail = "";
    try { detail = readDetail((await res.json()).detail); } catch { /* not json */ }
    throw new Error(detail || `Backend returned ${res.status}`);
  }
  return res.json();
}

const jsonBody = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// GET /?theme=...&resolutions=1080p&resolutions=4k
async function fetchWallpapers({ theme, resolutions, signal }) {
  const params = new URLSearchParams({ theme });
  resolutions.forEach((r) => params.append("resolutions", r));
  const data = await request(`/?${params}`, { signal });
  return data.images ?? [];
}

// POST /apply  { url }  ->  { status: "applied" | "failed" }
async function applyWallpaper(url) {
  const data = await request("/apply", jsonBody("POST", { url }));
  if (data.status !== "applied") throw new Error("Windows rejected the wallpaper");
}

// GET /saved     -> { images: [...] }
// POST /saved    (full image object)  -> { images: [...] }
// DELETE /saved  { id }               -> { images: [...] }
// Every call returns the whole saved list, so the backend stays the source of truth.
const fetchSaved = async () => (await request("/saved")).images ?? [];
const saveRemote = async (image) => (await request("/saved", jsonBody("POST", image))).images ?? [];
const removeRemote = async (id) => (await request("/saved", jsonBody("DELETE", { id }))).images ?? [];

/* ------------------------------------------------------------ components */

function SettingRow({ icon, title, desc, children, disabled = false }) {
  return (
    <div className={`row ${disabled ? "is-disabled" : ""}`}>
      <span className="row-icon"><Icon name={icon} size={17} /></span>
      <div className="row-text">
        <strong>{title}</strong>
        <p className="muted small">{desc}</p>
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`switch ${on ? "on" : ""}`} onClick={onChange} disabled={disabled}>
      <span className="knob" />
    </button>
  );
}

function Sidebar({ page, setPage, savedCount }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><Icon name="logo" size={17} fill /></span>
        <span className="brand-name">Walli</span>
      </div>
      <nav>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)} aria-current={page === n.id ? "page" : undefined}>
            <Icon name={n.icon} />
            <span className="nav-label">{n.label}</span>
            {n.id === "mine" && savedCount > 0 && <span className="badge">{savedCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SearchBox({ value, onChange, onSubmit }) {
  return (
    <form className="search" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Icon name="search" size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Search wallpapers, e.g. mountains" aria-label="Search wallpapers" />
    </form>
  );
}

function ResolutionPicker({ selected, setSelected }) {
  const toggle = (value) =>
    setSelected((prev) => {
      if (prev.includes(value)) return prev.length === 1 ? prev : prev.filter((v) => v !== value); // backend needs ≥1
      return [...prev, value];
    });
  return (
    <div className="seg" role="group" aria-label="Resolution">
      {RESOLUTIONS.map((r) => (
        <button key={r.value} className={`seg-btn ${selected.includes(r.value) ? "on" : ""}`}
          onClick={() => toggle(r.value)} aria-pressed={selected.includes(r.value)} title={r.hint}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

function Card({ image, saved, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true); // cached image
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const startWarm = () => { clearTimeout(timer.current); timer.current = setTimeout(() => warm(previewSrc(image)), 200); };
  const stopWarm = () => clearTimeout(timer.current);

  return (
    <button className={`card ${loaded ? "loaded" : ""}`} onClick={() => onOpen(image)}
      onMouseEnter={startWarm} onMouseLeave={stopWarm} onFocus={startWarm} onBlur={stopWarm}
      aria-label={`Open wallpaper ${image.id}, ${image.resolution}`}>
      <img ref={imgRef} src={image["thumbnail-large"]} alt="" loading="lazy"
        onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
      <span className="card-meta">
        <span>{image.resolution}</span>
        {saved && <Icon name="heart" size={13} fill />}
      </span>
    </button>
  );
}

function Grid({ children, hero = false }) {
  return <div className={`grid ${hero ? "hero" : ""}`}>{children}</div>;
}

function Notice({ title, text, action, onAction }) {
  return (
    <div className="notice">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="btn ghost" onClick={onAction}>{action}</button>}
    </div>
  );
}

function Modal({ image, saved, onClose, onSave, onApply, applying, saving }) {
  // three layers: blurred large thumb (instant, already cached) -> mid-size thumb -> full file
  const [midLoaded, setMidLoaded] = useState(false);
  const [hdReady, setHdReady] = useState(false);
  const closeRef = useRef(null);
  const midRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const el = midRef.current;
    if (el && el.complete && el.naturalWidth > 0) setMidLoaded(true);
  }, []);

  // download the full file in the background; show it only once it is fully decoded
  useEffect(() => {
    let cancelled = false;
    const hd = new Image();
    hd.decoding = "async";
    hd.src = image.url;
    hd.decode().then(() => { if (!cancelled) setHdReady(true); }).catch(() => { /* keep the mid-size preview */ });
    return () => { cancelled = true; hd.src = ""; }; // closing the preview cancels the download
  }, [image.url]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Wallpaper preview"
        onClick={(e) => e.stopPropagation()}>
        <div className={`preview ${midLoaded ? "mid-loaded" : ""}`}>
          <img className="preview-thumb" src={image["thumbnail-large"]} alt="" />
          <img ref={midRef} className="preview-mid" src={previewSrc(image)}
            alt={`Wallpaper ${image.id}`} onLoad={() => setMidLoaded(true)} />
          {hdReady && <img className="preview-hd" src={image.url} alt="" />}
          <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close preview">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-bar">
          <div>
            <strong>{image.resolution}</strong>
            <p className="muted small">Wallhaven · {image.id}</p>
          </div>
          <div className="modal-actions">
            <button className={`btn ghost ${saved ? "is-saved" : ""}`} onClick={() => onSave(image)} disabled={saving}>
              <Icon name={saved ? "check" : "heart"} size={16} />
              {saved ? "Saved" : "Save"}
            </button>
            <button className="btn primary" onClick={() => onApply(image)} disabled={applying}>
              <Icon name="monitor" size={16} />
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ app */

export default function App() {
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [resolutions, setResolutions] = useState(["1080p"]);

  // saved list lives on the backend (GET/POST/DELETE /saved); this is a mirror of it
  const [saved, setSaved] = useState([]);
  const [savedStatus, setSavedStatus] = useState("loading"); // loading | ok | error
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shuffleKey, setShuffleKey] = useState(0);

  // infinite scroll: images are appended page by page and kept in memory (no browser storage)
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const genRef = useRef(0);       // bumps on every filter change so late responses are ignored
  const busyRef = useRef(false);  // blocks overlapping "load more" calls
  const emptyRef = useRef(0);     // consecutive fetches that brought nothing new
  const contentRef = useRef(null);
  const sentinelRef = useRef(null);
  const homeScroll = useRef(0);
  const loadMoreRef = useRef(() => {});

  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);
  const closeModal = useCallback(() => setSelected(null), []);
  const browsing = page === "home";
  const theme = search.trim() || category; // a typed search beats the category

  const showToast = useCallback((text, kind = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // load saved wallpapers on start, and again whenever Saved Wallpapers / Settings opens
  const refreshSaved = useCallback(async () => {
    try {
      setSaved(await fetchSaved());
      setSavedStatus("ok");
    } catch {
      setSavedStatus("error");
    }
  }, []);
  useEffect(() => { refreshSaved(); }, [refreshSaved]);
  useEffect(() => {
    if (page === "mine" || page === "settings") refreshSaved();
  }, [page, refreshSaved]);

  // first page: runs on start and whenever the theme, resolutions or Shuffle change.
  // It does NOT depend on the current page, so coming back to Home keeps the list.
  useEffect(() => {
    const gen = ++genRef.current;
    const controller = new AbortController();
    busyRef.current = false;
    emptyRef.current = 0;
    homeScroll.current = 0;
    contentRef.current?.scrollTo(0, 0);
    setLoading(true);
    setError("");
    setHasMore(true);
    setMoreError(false);
    setLoadingMore(false);
    const t = setTimeout(() => {
      fetchWallpapers({ theme, resolutions, signal: controller.signal })
        .then((list) => {
          if (gen !== genRef.current) return;
          setImages(list);
          setHasMore(list.length > 0);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setImages([]);
          setError(err.message);
          setLoading(false);
        });
    }, 250); // one request when filters change quickly
    return () => { clearTimeout(t); controller.abort(); };
  }, [theme, resolutions, shuffleKey]);

  // next pages: the backend returns a fresh random batch each time, so duplicates are dropped
  // by id, and loading stops after two batches in a row that add nothing new.
  const loadMore = async () => {
    if (busyRef.current || loading || !hasMore || error || moreError) return;
    busyRef.current = true;
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const list = await fetchWallpapers({ theme, resolutions });
      if (gen !== genRef.current) return;
      const seen = new Set(images.map((i) => i.id));
      const fresh = list.filter((i) => !seen.has(i.id));
      emptyRef.current = fresh.length ? 0 : emptyRef.current + 1;
      if (fresh.length) setImages((prev) => [...prev, ...fresh]);
      if (emptyRef.current >= 2) setHasMore(false);
    } catch {
      if (gen === genRef.current) setMoreError(true);
    } finally {
      if (gen === genRef.current) setLoadingMore(false);
      busyRef.current = false;
    }
  };
  loadMoreRef.current = loadMore;

  // load the next batch when the marker under the grid gets within ~600px of the screen
  useEffect(() => {
    const el = sentinelRef.current;
    const root = contentRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreRef.current(); },
      { root, rootMargin: "0px 0px 600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [page, loading, images.length, hasMore, moreError]);

  // hover effects are switched off while scrolling by toggling a class directly on the
  // scroll container (not React state, so scrolling never triggers a re-render)
  const scrollTimer = useRef(null);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  const onContentScroll = (e) => {
    const el = e.currentTarget;
    if (page === "home") homeScroll.current = el.scrollTop;
    el.classList.add("is-scrolling");
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => el.classList.remove("is-scrolling"), 150);
  };
  // remember where Home was scrolled to and restore it when coming back
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = page === "home" ? homeScroll.current : 0;
  }, [page]);

  const submitSearch = () => {
    setSearch(query);
    if (page !== "home") setPage("home");
  };

  const pickCategory = (c) => { setCategory(c); setSearch(""); setQuery(""); };

  const toggleSave = async (image) => {
    const wasSaved = savedIds.has(image.id);
    const before = saved;
    // optimistic update, rolled back if the backend call fails
    setSaved(wasSaved ? before.filter((s) => s.id !== image.id) : [image, ...before]);
    setSaving(true);
    try {
      const list = wasSaved ? await removeRemote(image.id) : await saveRemote(image);
      setSaved(list);
      setSavedStatus("ok");
      showToast(wasSaved ? "Removed from saved wallpapers" : "Wallpaper saved", wasSaved ? "info" : "ok");
    } catch (err) {
      setSaved(before);
      showToast(`Couldn't ${wasSaved ? "remove" : "save"}: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const clearSaved = async () => {
    if (!saved.length) { showToast("Nothing to clear", "info"); return; }
    const ids = saved.map((s) => s.id);
    setSaving(true);
    try {
      await Promise.all(ids.map((id) => removeRemote(id)));
      setSaved(await fetchSaved());
      showToast("Saved wallpapers cleared", "info");
    } catch (err) {
      showToast(`Couldn't clear: ${err.message}`, "error");
      refreshSaved();
    } finally {
      setSaving(false);
    }
  };

  const onApply = async (image) => {
    setApplying(true);
    try {
      await applyWallpaper(image.url);
      showToast("Wallpaper applied");
    } catch (err) {
      showToast(`Couldn't apply: ${err.message}`, "error");
    } finally {
      setApplying(false);
    }
  };

  const heading = {
    home: search
      ? [`Results for “${search}”`, "Search by keyword or choose a category."]
      : [greeting(), "Random wallpapers picked for your theme and resolution."],
    mine: ["Saved Wallpapers", "Stored by the backend. Remove any wallpaper with the trash icon."],
    collections: ["Collections", "Something is brewing here."],
    settings: ["Settings", "App preferences and backend."],
  }[page];

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} savedCount={saved.length} />

      <div className="main">
        <div className="topbar">
          <SearchBox value={query} onChange={setQuery} onSubmit={submitSearch} />
        </div>

        <main className="content" ref={contentRef} onScroll={onContentScroll}>
          <header className="page-head">
            <div>
              <h1>{heading[0]}</h1>
              <p className="muted">{heading[1]}</p>
            </div>
            {browsing && (
              <button className="btn ghost" onClick={() => setShuffleKey((k) => k + 1)} disabled={loading}>
                <Icon name="shuffle" size={16} /> Shuffle
              </button>
            )}
          </header>

          {browsing && (
            <>
              <div className="filters">
                <div className="chips" role="group" aria-label="Category">
                  {CATEGORIES.map((c) => (
                    <button key={c} className={`chip ${!search && category === c ? "on" : ""}`}
                      onClick={() => pickCategory(c)}>{c}</button>
                  ))}
                </div>
                <ResolutionPicker selected={resolutions} setSelected={setResolutions} />
              </div>

              {error ? (
                <Notice title="Couldn't load wallpapers" text={`${error}. Check that the backend is running at ${API_URL}.`}
                  action="Try again" onAction={() => setShuffleKey((k) => k + 1)} />
              ) : loading ? (
                <Grid hero>
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="card skeleton" />)}
                </Grid>
              ) : images.length ? (
                <>
                  <Grid hero>
                    {images.map((img) => (
                      <Card key={img.id} image={img} saved={savedIds.has(img.id)} onOpen={setSelected} />
                    ))}
                  </Grid>
                  <div ref={sentinelRef} className="scroll-sentinel" />
                  <div className="scroll-end" role="status">
                    {moreError ? (
                      <button className="btn ghost" onClick={() => setMoreError(false)}>
                        Couldn't load more. Try again
                      </button>
                    ) : loadingMore ? "Loading more…" : !hasMore ? "You've reached the end" : null}
                  </div>
                </>
              ) : (
                <Notice title="No wallpapers found" text="Try another keyword or turn on more resolutions." />
              )}
            </>
          )}

          {page === "mine" &&
            (savedStatus === "error" && !saved.length ? (
              <Notice title="Couldn't load saved wallpapers" text={`Check that the backend is running at ${API_URL}.`}
                action="Try again" onAction={refreshSaved} />
            ) : saved.length ? (
              <Grid>
                {saved.map((img) => (
                  <div key={img.id} className="card-wrap">
                    <Card image={img} saved onOpen={setSelected} />
                    <button className="card-remove" onClick={() => toggleSave(img)} disabled={saving}
                      aria-label={`Remove wallpaper ${img.id} from saved`} title="Remove from saved">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </Grid>
            ) : savedStatus === "loading" ? (
              <Grid>
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card skeleton" />)}
              </Grid>
            ) : (
              <Notice title="Nothing saved yet" text="Open a wallpaper and choose Save."
                action="Browse wallpapers" onAction={() => setPage("home")} />
            ))}

          {page === "collections" && (
            <Notice title="Collections coming soon"
              text="The developer is still finding the right idea for this page, and honestly, so are we. Try the categories on Home meanwhile."
              action="Go to Home" onAction={() => setPage("home")} />
          )}

          {page === "settings" && (
            <div className="settings-wrap">
              <h3 className="group-title">General</h3>
              <div className="settings">
                <SettingRow icon="power" title="Run on startup" disabled
                  desc="Start Walli when you sign in to Windows. Not available yet.">
                  <span className="soon">Soon</span>
                  <Toggle label="Run on startup (not available yet)" on={false} disabled />
                </SettingRow>
              </div>

              <h3 className="group-title">Backend</h3>
              <div className="settings">
                <SettingRow icon="server" title="Backend URL">
                  <code>{API_URL}</code>
                </SettingRow>
                <SettingRow icon="pulse" title="Backend status" desc="Checked when you open this page.">
                  <span className={`status ${savedStatus}`}>
                    <span className="dot" />
                    {savedStatus === "ok" ? "Connected" : savedStatus === "error" ? "Unreachable" : "Checking…"}
                  </span>
                </SettingRow>
              </div>

              <h3 className="group-title">Wallpapers</h3>
              <div className="settings">
                <SettingRow icon="monitor" title="Active resolutions" desc="Change them with the filter on Home.">
                  <code>{resolutions.join(", ")}</code>
                </SettingRow>
                <SettingRow icon="heart" title="Saved wallpapers" desc="Removes everything in Saved Wallpapers.">
                  <button className="btn ghost" disabled={saving} onClick={clearSaved}>
                    <Icon name="trash" size={15} /> Clear
                  </button>
                </SettingRow>
              </div>
            </div>
          )}
        </main>
      </div>

      {selected && (
        <Modal image={selected} saved={savedIds.has(selected.id)} onClose={closeModal}
          onSave={toggleSave} onApply={onApply} applying={applying} saving={saving} />
      )}
      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  );
}
