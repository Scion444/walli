import React from "react";
import { RESOLUTIONS } from "../constants/appConstants";

export function ResolutionPicker({ selected, setSelected }) {
  const toggle = (value) =>
    setSelected((prev) => {
      if (prev.includes(value)) return prev.length === 1 ? prev : prev.filter((v) => v !== value); // backend needs ≥1
      return [...prev, value];
    });

  return (
    <div className="seg" role="group" aria-label="Resolution">
      {RESOLUTIONS.map((r) => (
        <button
          key={r.value}
          className={`seg-btn ${selected.includes(r.value) ? "on" : ""}`}
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

export default ResolutionPicker;
