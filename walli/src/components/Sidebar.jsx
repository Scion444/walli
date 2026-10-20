import React from "react";
import { Icon } from "./Icon";
import { NAV } from "../constants/appConstants";

export function Sidebar({ page, setPage, savedCount }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="logo" size={17} fill />
        </span>
        <span className="brand-name">Walli</span>
      </div>
      <nav>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
            aria-current={page === n.id ? "page" : undefined}
          >
            <Icon name={n.icon} />
            <span className="nav-label">{n.label}</span>
            {n.id === "mine" && savedCount > 0 && <span className="badge">{savedCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
