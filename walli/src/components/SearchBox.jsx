import React from "react";
import { Icon } from "./Icon";

export function SearchBox({ value, onChange, onSubmit }) {
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Icon name="search" size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search wallpapers, e.g. mountains"
        aria-label="Search wallpapers"
      />
    </form>
  );
}

export default SearchBox;
