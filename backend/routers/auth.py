from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


# log a user in, return necessary info, such as if they are a driver
@router.post("/login")
async def login():
    pass
