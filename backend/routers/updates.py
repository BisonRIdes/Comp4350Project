from fastapi import APIRouter

router = APIRouter(prefix="/updates", tags=["updates"])


# get any info needed to display on the page for a given user
@router.get("")
async def get_updates():
    pass
