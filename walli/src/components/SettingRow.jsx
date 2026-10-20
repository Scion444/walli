import React from "react";
import { Icon } from "./Icon";

export function SettingRow({ icon, title, desc, children, disabled = false }) {
  return (
    <div className={`row ${disabled ? "is-disabled" : ""}`}>
      <span className="row-icon">
        <Icon name={icon} size={17} />
      </span>
      <div className="row-text">
        <strong>{title}</strong>
        <p className="muted small">{desc}</p>
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

export default SettingRow;
