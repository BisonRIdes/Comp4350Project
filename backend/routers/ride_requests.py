from fastapi import APIRouter

router = APIRouter(tags=["ride requests"])


# make a request for a driver to give you a ride
@router.post("/drivers/{driver_id}/requests", status_code=201)
async def create_ride_request(driver_id: str):
    pass


# driver accepts a ride request from a user
@router.post("/requests/{request_id}/accept")
async def accept_ride_request(request_id: str):
    pass
