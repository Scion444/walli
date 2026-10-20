import os
import sys
import ctypes
from urllib.parse import urlparse
from fastapi import HTTPException

ALLOWED_HOSTS = {"w.wallhaven.cc", "wallhaven.cc"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png"}


def validate_image_url(url: str) -> str:
    """Validates that the image URL is https, from wallhaven, and has an allowed extension."""
    parsed = urlparse(url)
    ext = os.path.splitext(parsed.path)[1].lower()
    if (
        parsed.scheme != "https"
        or parsed.hostname not in ALLOWED_HOSTS
        or ext not in ALLOWED_EXT
    ):
        raise HTTPException(status_code=400, detail="invalid image url")
    return ext


def set_desktop_wallpaper(image_path: str) -> bool:
    """
    Sets the desktop background wallpaper.
    Uses Windows SystemParametersInfoW on Windows, with graceful fallback on other OS.
    """
    abs_path = os.path.abspath(image_path)
    if sys.platform == "win32":
        try:
            user32 = ctypes.windll.user32
            # SPI_SETDESKWALLPAPER = 20, SPIF_UPDATEINIFILE = 1, SPIF_SENDCHANGE = 2 (1|2 = 3)
            return bool(user32.SystemParametersInfoW(20, 0, abs_path, 3))
        except Exception:
            return False
    # Non-Windows fallback (for development/testing on macOS/Linux)
    return True
