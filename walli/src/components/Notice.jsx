import React from "react";

export function Notice({ title, text, action, onAction }) {
  return (
    <div className="notice">
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

export default Notice;
