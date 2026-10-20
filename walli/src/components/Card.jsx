import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { warm, previewSrc } from "../utils/helpers";

export function Card({ image, saved, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true); // cached image
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const startWarm = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => warm(previewSrc(image)), 200);
  };
  const stopWarm = () => clearTimeout(timer.current);

  return (
    <button
      className={`card ${loaded ? "loaded" : ""}`}
      onClick={() => onOpen(image)}
      onMouseEnter={startWarm}
      onMouseLeave={stopWarm}
      onFocus={startWarm}
      onBlur={stopWarm}
      aria-label={`Open wallpaper ${image.id}, ${image.resolution}`}
    >
      <img
        ref={imgRef}
        src={image["thumbnail-large"]}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      <span className="card-meta">
        <span>{image.resolution}</span>
        {saved && <Icon name="heart" size={13} fill />}
      </span>
    </button>
  );
}

export default Card;
