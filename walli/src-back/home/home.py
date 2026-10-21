import os
import sys
import re
import httpx
import uvicorn
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Ensure module directory and PyInstaller bundle dir are in sys.path
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    if sys._MEIPASS not in sys.path:
        sys.path.insert(0, sys._MEIPASS)
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from schemas import ApplyRequest, WallpaperItem, take, Wallpaper
from storage import storage, DATA_DIR
from wallpaper_service import validate_image_url, set_desktop_wallpaper

app = FastAPI(title="Walli Backend")
fetch = app  # Backward compatibility alias

# Allow local frontend development and Tauri webview requests
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|tauri\.localhost)(:\d+)?|tauri://localhost)$",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)

RESOLUTION_PRESETS = {
    "hd": "1280x720",
    "1080p": "1920x1080",
    "fhd": "1920x1080",
    "2k": "2560x1440",
    "qhd": "2560x1440",
    "4k": "3840x2160",
    "uhd": "3840x2160",
}

RES_PATTERN = re.compile(r"^\d{3,5}x\d{3,5}$")


def parse_resolutions(values: List[str]) -> List[str]:
    """Validates and normalizes resolution labels and hints to standard dimensions."""
    result = []
    for value in values:
        for item in value.split(","):
            item = item.strip().lower()
            if not item:
                continue
            res = RESOLUTION_PRESETS.get(item, item)
            if not RES_PATTERN.match(res):
                raise HTTPException(status_code=400, detail=f"invalid resolution: {item}")
            if res not in result:
                result.append(res)
    return result


resolution = parse_resolutions  # Backward compatibility alias


@app.get("/health")
async def health_check():
    """Health check endpoint for frontend startup polling."""
    return {"status": "ok"}


@app.get("/")
async def get_image(theme: str, resolutions: List[str] = Query(default=["1080p"])):
    """Fetches a random page of wallpapers from Wallhaven matching theme and resolutions."""
    result = parse_resolutions(resolutions)
    if not result:
        raise HTTPException(status_code=400, detail="select resolution")

    param = {"sorting": "random", "per_page": 24, "resolutions": ",".join(result)}
    if theme.lower() not in ("all", "no-preference"):
        param["q"] = theme

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get("https://wallhaven.cc/api/v1/search", params=param)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="backend failed")
            data = response.json().get("data", [])
            return {
                "images": [
                    {
                        "id": image["id"],
                        "url": image["path"],
                        "thumbnail-large": image["thumbs"]["large"],
                        "thumbnail-original": image["thumbs"]["original"],
                        "thumbnail-small": image["thumbs"]["small"],
                        "resolution": image["resolution"],
                    }
                    for image in data
                ]
            }
    except httpx.RequestError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reach wallpaper provider: {exc}")


@app.post("/apply")
async def apply(item: ApplyRequest):
    """Downloads the selected wallpaper and sets it as the desktop background."""
    ext = validate_image_url(item.url)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(item.url)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="image not found")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to download wallpaper: {exc}")

    wallpaper_path = os.path.join(DATA_DIR, f"wallpaper{ext}")
    try:
        with open(wallpaper_path, "wb") as f:
            f.write(response.content)
    except IOError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save wallpaper locally: {exc}")

    if not set_desktop_wallpaper(wallpaper_path):
        return {"status": "failed"}
    return {"status": "applied"}


@app.get("/saved")
async def get_saved():
    """Returns all saved wallpapers."""
    return {"images": await storage.get_all()}


@app.post("/saved")
async def saved_image(item: Dict[str, Any]):
    """Adds a wallpaper to the saved list if not already present."""
    updated = await storage.add(item)
    return {"images": updated}


@app.delete("/saved")
async def del_saved(item: Dict[str, Any]):
    """Removes a wallpaper from the saved list by its id."""
    updated = await storage.remove(item.get("id"))
    return {"images": updated}


# Expose saved for backward compatibility
saved = storage.saved


if __name__ == "__main__":
    uvicorn.run(fetch, host="127.0.0.1", port=8000, log_config=None)