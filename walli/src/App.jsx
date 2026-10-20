import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { API_URL, CATEGORIES, RESOLUTIONS } from "./constants/appConstants";
import { greeting } from "./utils/helpers";
import {
  fetchWallpapers,
  applyWallpaper,
  fetchSaved,
  saveRemote,
  removeRemote,
  waitForBackend,
} from "./services/api";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { SearchBox } from "./components/SearchBox";
import { ResolutionPicker } from "./components/ResolutionPicker";
import { Card } from "./components/Card";
import { Grid } from "./components/Grid";
import { Notice } from "./components/Notice";
import { Modal } from "./components/Modal";
import { SettingRow } from "./components/SettingRow";
import { Toggle } from "./components/Toggle";

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

  const [backendReady, setBackendReady] = useState(false);
  const [initKey, setInitKey] = useState(0);

  // on startup: poll /health to smoothly wait for backend sidecar initialization
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    waitForBackend({ maxAttempts: 12, intervalMs: 300, signal: controller.signal }).then((ok) => {
      if (controller.signal.aborted) return;
      if (ok) {
        setBackendReady(true);
        refreshSaved();
      } else {
        setImages([]);
        setError("Can't reach the backend");
        setLoading(false);
        setSavedStatus("error");
      }
    });
    return () => controller.abort();
  }, [initKey, refreshSaved]);

  useEffect(() => {
    if (page === "mine" || page === "settings") refreshSaved();
  }, [page, refreshSaved]);

  // first page: runs on start (once backend is ready) and whenever the theme, resolutions or Shuffle change.
  // It does NOT depend on the current page, so coming back to Home keeps the list.
  useEffect(() => {
    if (!backendReady) return;
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
  }, [theme, resolutions, shuffleKey, backendReady]);

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
                  action="Try again" onAction={() => { setInitKey((k) => k + 1); setShuffleKey((k) => k + 1); }} />
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
