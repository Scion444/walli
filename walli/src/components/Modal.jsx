import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { previewSrc } from "../utils/helpers";

export function Modal({ image, saved, onClose, onSave, onApply, applying, saving }) {
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
    hd.decode()
      .then(() => {
        if (!cancelled) setHdReady(true);
      })
      .catch(() => {
        /* keep the mid-size preview */
      });
    return () => {
      cancelled = true;
      hd.src = "";
    }; // closing the preview cancels the download
  }, [image.url]);

  useEffect(() => {
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
        <div className={`preview ${midLoaded ? "mid-loaded" : ""}`}>
          <img className="preview-thumb" src={image["thumbnail-large"]} alt="" />
          <img
            ref={midRef}
            className="preview-mid"
            src={previewSrc(image)}
            alt={`Wallpaper ${image.id}`}
            onLoad={() => setMidLoaded(true)}
          />
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
            <button
              className={`btn ghost ${saved ? "is-saved" : ""}`}
              onClick={() => onSave(image)}
              disabled={saving}
            >
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

export default Modal;
