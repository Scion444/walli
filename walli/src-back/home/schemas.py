from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ApplyRequest(BaseModel):
    url: str


# Backward compatibility alias
take = ApplyRequest


class WallpaperItem(BaseModel):
    id: str
    url: str
    thumbnail_large: Optional[str] = Field(default=None, alias="thumbnail-large")
    thumbnail_original: Optional[str] = Field(default=None, alias="thumbnail-original")
    thumbnail_small: Optional[str] = Field(default=None, alias="thumbnail-small")
    resolution: Optional[str] = None

    class Config:
        populate_by_name = True


# Backward compatibility alias
Wallpaper = WallpaperItem
