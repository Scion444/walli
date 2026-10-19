<div align="center">

<img width="150" height="125" alt="Minimal White Mountain App Icon" src="https://github.com/user-attachments/assets/329f6789-0c61-4a02-808e-946abdf8852c" />


# Walli

**A fast, minimal wallpaper browser for your desktop.**
Discover, preview, save and apply beautiful wallpapers in one click.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)
![Contributions](https://img.shields.io/badge/contributors-welcome-orange)


</div>

---

## Preview

<div align="center">

<img width="1919" height="1033" alt="Screenshot 2026-10-19 212007" src="https://github.com/user-attachments/assets/b8241fb7-fcd7-4aa8-81fd-92f13940bc8a" />


<br/><br/>

<img width="1919" height="1035" alt="Screenshot 2026-10-19 212042" src="https://github.com/user-attachments/assets/a6a95a87-3404-4b7e-9a90-c872d2ac38b7" />


</div>

---

## Features

- **Smart home feed** – random wallpapers picked for your theme and resolution
- **Search** – find exactly what you want, e.g. *mountains*
- **Categories** – Nature, Anime, Minimal, Gaming, City, Abstract, Technology
- **Resolution filters** – HD, 1080p, 2K and 4K
- **Shuffle** – refresh the feed with a single click
- **Full preview** – view any wallpaper large, with its resolution and source
- **Save** – keep your favourites in *Saved Wallpapers*
- **Collections** – organise wallpapers your way
- **Apply instantly** – set a wallpaper as your desktop background
- **Dark, clean UI** – built to stay out of the way of the art

---

## Project Structure

```
walli/
├── src/                  # Frontend (UI)
├── src-back/             # Backend
│   └── home/
│       └── home.py       # Backend logic for the Home feed
├── assets/               # README images & logo
└── README.md
```

| Part | Location | What it does |
|------|----------|--------------|
| **Frontend** | `src/` | The interface: home feed, search, filters, preview modal, saved wallpapers, collections, settings |
| **Backend** | `src-back/home/home.py` | Home logic: fetching wallpapers, applying category / resolution filters, shuffle, search |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (for the frontend)
- [Python 3.10+](https://www.python.org/) (for the backend)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Scion444/walli.git
cd walli

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
pip install -r requirements.txt
```

### Run in development

```bash
npm run dev
```


---

## Contributing

Contributions are **very welcome**, whether it's a bug fix, a new feature, better docs or a design tweak.

1. **Fork** the repository
2. **Create** a branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m "Add amazing feature"`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Where to work

- UI, styling and interactions → `src/`
- Wallpaper fetching and Home logic → `src-back/home/home.py`

### Ideas to get you started

- More wallpaper sources
- Auto-change wallpaper on a schedule
- Multi-monitor support
- New categories and themes
- Performance improvements

## Known Issues

- **Backend connection on first launch:** the frontend may ask you to reload the app before it connects to the backend. Reloading once fixes it. A proper fix (automatic retry or a "backend ready" check) is a great first contribution, see `src/` for the connection logic and `src-back/home/home.py` for the backend side.

Found another problem? [Open an issue](../../issues).

---
Found a bug or have an idea? [Open an issue](../../issues), all feedback helps.

---

## Credits

Wallpapers are sourced from [Wallhaven](https://wallhaven.cc/). All wallpapers belong to their respective creators.

---


<div align="center">

Made with care. If you like Walli, consider giving it a star.

</div>
