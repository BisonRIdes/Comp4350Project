from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
from routers import auth, ride_requests, rides, updates, users

app = FastAPI(title="BisonRides")

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 
    yield
    await engine.dispose()

@app.get("/test")
async def health_check():
    return {"message": "API is working!"}


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(rides.router)
app.include_router(ride_requests.router)
app.include_router(updates.router)
