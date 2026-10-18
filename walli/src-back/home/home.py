import os , httpx ,json , asyncio 
from fastapi import FastAPI , HTTPException
from fastapi.middleware.cors import CORSMiddleware
fetch = FastAPI()
fetch.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)
@fetch.get('/')
async def get_image(theme:str):
    if theme.lower() not in ("all","no-preference"):
        param["q"]= theme
    param = {"sorting":"random","per_page":1}
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

