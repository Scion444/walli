import os , httpx ,json , asyncio 
from fastapi import FastAPI , HTTPException
fetch = FastAPI()

@fetch.get('/')
async def get_image(theme:str):
    if theme.lower() not in ("all","no-preference"):
        param["q"]= theme
    param = {"sorting":"random","per_page":1}
    async with httpx.AsyncClient() as client:
        response =  await client.get("https://wallhaven.cc/api/v1/search",params=param)
        if response.status_code!=200:
            raise HTTPException("500" , "backend failed")
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

