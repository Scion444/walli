import React from "react";

export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? "on" : ""}`}
      onClick={onChange}
      disabled={disabled}
    >
      <span className="knob" />
    </button>
  );
}

export default Toggle;
