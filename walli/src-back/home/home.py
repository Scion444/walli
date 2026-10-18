import os , httpx ,json , asyncio ,re 
from fastapi import FastAPI , HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
fetch = FastAPI()

fetch.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST"],
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
    param = {"sorting":"random","per_page":12,"resolutions": ",".join(result)}
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


