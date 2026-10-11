from fastapi import FastAPI
from routers import auth, ride_requests, rides, updates, users

app = FastAPI(title="BisonRides")

@app.get("/test")
async def health_check():
    return {"message": "API is working!"}

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(rides.router)
app.include_router(ride_requests.router)
app.include_router(updates.router)