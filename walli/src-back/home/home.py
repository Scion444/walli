import os , httpx ,json , asyncio ,re 
from  pydantic import BaseModel
import ctypes
from urllib.parse import urlparse
from fastapi import FastAPI , HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
fetch = FastAPI()

fetch.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST","DELETE"],
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

def resolution(values:list[str])-> list[str]:
    result =[]
    for value in values:
        for item in value.split(","):
            item  = item.strip().lower()
            if not item:
                continue
            res = RESOLUTION_PRESETS.get(item,item)
            if not RES_PATTERN.match(res):
                raise HTTPException(400, f"invalid resolution: {item}")
            if res not in result:
                result.append(res)
    return result

@fetch.get('/')
async def get_image(theme:str, resolutions: list[str] = Query(default=["1080p"])):
    result = resolution(resolutions)
    if not result:
        raise HTTPException(400,"select resolution")
    param = {"sorting":"random","per_page":24,"resolutions": ",".join(result)}
    if theme.lower() not in ("all","no-preference"):
        param["q"]= theme
    async with httpx.AsyncClient() as client:
        response =  await client.get("https://wallhaven.cc/api/v1/search",params=param)
        if response.status_code!=200:
            raise HTTPException(500 , "backend failed")
        data = response.json()["data"]
        return {
            "images" :[{
                "id":image["id"],
                "url":image["path"],
                "thumbnail-large":image["thumbs"]["large"],
                "thumbnail-original":image["thumbs"]["original"],
                "thumbnail-small" : image["thumbs"]["small"],
                "resolution" : image["resolution"]
        }for image in data]
        }


class take(BaseModel):
    url :str

ALLOWED_HOSTS = {"w.wallhaven.cc", "wallhaven.cc"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png"}

@fetch.post('/apply')
async def apply(item:take):
    parsed = urlparse(item.url)
    ext = os.path.splitext(parsed.path)[1].lower()
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS or ext not in ALLOWED_EXT:
        raise HTTPException(400, "invalid image url")

    async with httpx.AsyncClient() as apply:
        response  = await apply.get(item.url)
    if response.status_code !=200:
        raise HTTPException(500,"image not found")
    open(f"wallpaper{ext}","wb").write(response.content)
    path = os.path.abspath(f"wallpaper{ext}")
    elon = ctypes.windll.user32
    if not elon.SystemParametersInfoW(20,0,path,3):
        return {"status":"failed"}
    return{"status":"applied"} 


saved_file = "saved.json"

def load_saved()->list[dict]:
    with open(saved_file,"r",encoding="utf-8") as f:
        return json.load(f)
def write_saved():
    with open(saved_file, "w", encoding="utf-8") as f:
        json.dump(saved, f, indent=2)
class Wallpaper(BaseModel):
    id: str
    url: str
    thumbnail_large: str | None = None
    resolution: str | None = None

saved : list[dict] = load_saved()

@fetch.post('/saved')
async def saved_image(item:dict):
    if not any(s["id"]==item.get("id") for s in saved):
        saved.insert(0,item)
    return {"images":saved}


@fetch.get('/saved')
async def get_saved():
    return {"images":saved}

@fetch.delete('/saved')
async def del_saved(item:dict):
    for s in saved:
        if s["id"]==item["id"]:
            saved.remove(s)
            write_saved()
            break
    return {"images":saved}