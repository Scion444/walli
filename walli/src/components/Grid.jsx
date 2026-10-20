import React from "react";

export function Grid({ children, hero = false }) {
  return <div className={`grid ${hero ? "hero" : ""}`}>{children}</div>;
}

export default Grid;
