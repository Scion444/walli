import os
import json
import asyncio
from typing import List, Dict, Any

DATA_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "Walli")
os.makedirs(DATA_DIR, exist_ok=True)
SAVED_FILE = os.path.join(DATA_DIR, "saved.json")


class SavedStorage:
    """Thread-safe and concurrency-safe storage for saved wallpapers."""

    def __init__(self, file_path: str = SAVED_FILE):
        self.file_path = file_path
        self._lock = asyncio.Lock()
        self.saved: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except (json.JSONDecodeError, IOError):
            return []

    def _atomic_write(self) -> None:
        """Writes to a temporary file first, then atomically replaces the target file."""
        temp_file = f"{self.file_path}.tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self.saved, f, indent=2)
            os.replace(temp_file, self.file_path)
        except Exception:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass
            raise

    async def get_all(self) -> List[Dict[str, Any]]:
        async with self._lock:
            return list(self.saved)

    async def add(self, item: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with self._lock:
            if not any(s.get("id") == item.get("id") for s in self.saved):
                self.saved.insert(0, item)
                self._atomic_write()
            return list(self.saved)

    async def remove(self, item_id: Any) -> List[Dict[str, Any]]:
        async with self._lock:
            for s in self.saved:
                if s.get("id") == item_id:
                    self.saved.remove(s)
                    self._atomic_write()
                    break
            return list(self.saved)

    async def clear(self) -> List[Dict[str, Any]]:
        async with self._lock:
            self.saved = []
            self._atomic_write()
            return []


storage = SavedStorage()
