export const API_URL = "http://127.0.0.1:8000";

export const CATEGORIES = [
  "All",
  "Nature",
  "Anime",
  "Minimal",
  "Gaming",
  "City",
  "Abstract",
  "Technology",
];

export const RESOLUTIONS = [
  { value: "hd", label: "HD", hint: "1280×720" },
  { value: "1080p", label: "1080p", hint: "1920×1080" },
  { value: "2k", label: "2K", hint: "2560×1440" },
  { value: "4k", label: "4K", hint: "3840×2160" },
];

export const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "mine", label: "Saved Wallpapers", icon: "image" },
  { id: "collections", label: "Collections", icon: "grid" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

export const ICONS = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  sliders: "M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4",
  heart: "M12 20s-7-4.4-9-9.2C1.8 7.6 4 5 6.8 5c1.9 0 3.5 1 5.2 3 1.7-2 3.3-3 5.2-3C20 5 22.2 7.6 21 10.8 19 15.6 12 20 12 20z",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  shuffle: "M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  logo: "M3 19l6-10 4 6 2.5-4L21 19z",
  power: "M12 3v8M7 6.5a7 7 0 1 0 10 0",
  server: "M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01",
  pulse: "M3 12h4l3-7 4 14 3-7h4",
};
