from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ChatRecord, MessageRecord, Ride, RideRegistration
from schemas import ChatMessage, MessagePage
from util.auth import CurrentUser, get_current_user
from util.chat_utils import (
    ChatType,
    MessageBody,
    PersonalChatBody,
    accessible_chat,
    chat_out,
    decode_cursor,
    encode_cursor,
    find_or_create,
    get_ride,
    message_out,
    participant_names,
    participants,
)
from util.constants import MESSAGE_LENGTH

Db = Annotated[AsyncSession, Depends(get_db)]
router = APIRouter(tags=["Chats"], dependencies=[Depends(get_current_user)])


@router.post(
    "/rides/{ride_id}/chats/personal",
    status_code=201,
    response_model=ChatType,
    operation_id="createPersonalChat",
    responses={200: {"model": ChatType}},
)
async def create_personal_chat(
    ride_id: str, body: PersonalChatBody, response: Response, user: CurrentUser, db: Db
) -> ChatType:
    ride = await get_ride(db, ride_id)
    rider_id = body.rider_id
    if rider_id is None:
        if user.id == ride.driver_id:
            raise HTTPException(status_code=422, detail="Driver must specify a rider_id")
        rider_id = user.id
    registration = await db.get(RideRegistration, (ride.id, rider_id))
    if rider_id == ride.driver_id:
        raise HTTPException(
            status_code=403, detail="Driver cannot create a personal chat with themself"
        )
    if registration is None:
        raise HTTPException(status_code=403, detail="Rider is not part of this ride")
    if user.id not in (ride.driver_id, rider_id):
        raise HTTPException(status_code=403, detail="You cannot access this personal chat")
    chat = await find_or_create(db, ride.id, "personal", rider_id, response)
    member_ids = [ride.driver_id, rider_id]
    return chat_out(chat, member_ids, await participant_names(db, set(member_ids)))


@router.post(
    "/rides/{ride_id}/chats/group",
    status_code=201,
    response_model=ChatType,
    operation_id="createGroupChat",
    responses={200: {"model": ChatType}},
)
async def create_group_chat(
    ride_id: str, response: Response, user: CurrentUser, db: Db
) -> ChatType:
    ride = await get_ride(db, ride_id)
    registration = await db.get(RideRegistration, (ride.id, user.id))
    if user.id != ride.driver_id and registration is None:
        raise HTTPException(status_code=403, detail="You cannot access this group chat")
    chat = await find_or_create(db, ride.id, "group", "", response)
    member_ids = await participants(db, chat, ride)
    return chat_out(chat, member_ids, await participant_names(db, set(member_ids)))


@router.get("/chats", response_model=list[ChatType], operation_id="listChats")
async def get_chats(user: CurrentUser, db: Db) -> list[ChatType]:
    # Restrict candidates in SQL, then apply the current membership policy.
    registered_rides = select(RideRegistration.ride_id).where(RideRegistration.rider_id == user.id)
    query = (
        select(ChatRecord, Ride)
        .join(Ride, ChatRecord.ride_id == Ride.id)
        .where(or_(Ride.driver_id == user.id, ChatRecord.ride_id.in_(registered_rides)))
        .order_by(ChatRecord.id)
    )
    visible_chats = []
    for chat, ride in (await db.execute(query)).all():
        member_ids = await participants(db, chat, ride)
        if user.id in member_ids:
            visible_chats.append((chat, member_ids))
    member_ids = {member_id for _, ids in visible_chats for member_id in ids}
    names = await participant_names(db, member_ids)
    return [chat_out(chat, ids, names) for chat, ids in visible_chats]


@router.get(
    "/chats/{chat_id}/messages", response_model=MessagePage, operation_id="listChatMessages"
)
async def list_chat_messages(
    chat_id: str,
    user: CurrentUser,
    db: Db,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MessagePage:
    chat = await accessible_chat(db, chat_id, user.id)
    query = select(MessageRecord).where(MessageRecord.chat_id == chat.id)
    if cursor is not None:
        timestamp, message_id = decode_cursor(cursor, chat.id)
        query = query.where(
            or_(
                MessageRecord.created_at < timestamp,
                and_(MessageRecord.created_at == timestamp, MessageRecord.id < message_id),
            )
        )
    rows = list(
        (
            await db.scalars(
                query.order_by(MessageRecord.created_at.desc(), MessageRecord.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    page = rows[:limit]
    return MessagePage(
        messages=[message_out(message) for message in page],
        next_cursor=encode_cursor(page[-1]) if len(rows) > limit else None,
    )


@router.post(
    "/chats/{chat_id}/messages",
    status_code=201,
    response_model=ChatMessage,
    operation_id="sendChatMessage",
)
async def send_chat_message(
    chat_id: str, body: MessageBody, user: CurrentUser, db: Db
) -> ChatMessage:
    chat = await accessible_chat(db, chat_id, user.id)
    if len(body.content) > MESSAGE_LENGTH:
        raise HTTPException(status_code=422, detail="Message is too long")
    message = MessageRecord(chat_id=chat.id, sender_id=user.id, content=body.content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message_out(message)
