import os
import secrets
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader

from database import Base, engine
from routers import auth, ride_requests, rides, updates, users

API_KEY = os.environ["API_KEY"]

header_scheme = APIKeyHeader(name="x-key", auto_error=None)


def require_key(key: str | None = Security(header_scheme)):
    # safe comparison
    if not key or not secrets.compare_digest(key.encode(), API_KEY.encode()):
        raise HTTPException(status_code=401)


app = FastAPI(title="BisonRides", dependencies=[Depends(require_key)])


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
