from fastapi import APIRouter

router = APIRouter(prefix="/rides", tags=["rides"])


# return a list of all rides for populating the frontend
@router.get("")
async def list_rides():
    pass


# driver can post a ride
@router.post("", status_code=201)
async def create_ride():
    pass
