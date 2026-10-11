from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


#create an account
@router.post("", status_code=201)
async def create_account():
    pass
