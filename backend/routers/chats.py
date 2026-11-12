import base64
import json
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Chat as ChatRecord
from models import ChatMessage as MessageRecord
from models import Ride, RideRegistration
from schemas import Chat, ChatMessage, CreatePersonalChatRequest, MessagePage, SendMessageRequest
from util.auth import CurrentUser, get_current_user


# Narrow the supplied schemas locally to enforce the contract without changing
# schemas.py, which is also used by the other routers.
class PersonalChatBody(CreatePersonalChatRequest):
    rider_id: str


class MessageBody(SendMessageRequest):
    content: str = Field(min_length=1)


class ChatOut(Chat):
    type: Literal["personal", "group"]


Db = Annotated[AsyncSession, Depends(get_db)]
router = APIRouter(tags=["Chats"], dependencies=[Depends(get_current_user)])


async def get_ride(db: AsyncSession, ride_id: str) -> Ride:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride


async def participants(db: AsyncSession, chat: ChatRecord, ride: Ride) -> list[str]:
    """Compute membership from current registrations, never a cached list."""
    query = select(RideRegistration.rider_id).where(RideRegistration.ride_id == ride.id)
    if chat.type == "personal":
        query = query.where(RideRegistration.rider_id == chat.rider_key)
    riders = list((await db.scalars(query.order_by(RideRegistration.rider_id))).all())
    # A personal chat has no eligible participants once its rider cancels.
    return [] if chat.type == "personal" and not riders else list(dict.fromkeys([ride.driver_id, *riders]))

def chat_out(chat: ChatRecord, member_ids: list[str]) -> ChatOut:
    return ChatOut(id=chat.id, ride_id=chat.ride_id, type=chat.type, participant_ids=member_ids)

async def accessible_chat(db: AsyncSession, chat_id: str, user_id: str) -> ChatRecord:
    chat = await db.get(ChatRecord, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    ride = await get_ride(db, chat.ride_id)
    if user_id not in await participants(db, chat, ride):
        raise HTTPException(status_code=403, detail="You cannot access this chat")
    return chat


async def find_or_create(
    db: AsyncSession, ride_id: str, kind: str, rider_key: str, response: Response
) -> ChatRecord:
    query = select(ChatRecord).where(
        ChatRecord.ride_id == ride_id,
        ChatRecord.type == kind,
        ChatRecord.rider_key == rider_key,
    )
    existing = await db.scalar(query)
    if existing is not None:
        response.status_code = 200
        return existing
    chat = ChatRecord(ride_id=ride_id, type=kind, rider_key=rider_key)
    db.add(chat)
    try:
        await db.commit()
    except IntegrityError:
        # A concurrent request may have created this same chat first.
        await db.rollback()
        existing = await db.scalar(query)
        if existing is None:
            raise
        response.status_code = 200
        return existing
    await db.refresh(chat)
    response.status_code = 201
    return chat


@router.post(
    "/rides/{ride_id}/chats/personal", status_code=201, response_model=ChatOut,
    operation_id="createPersonalChat", responses={200: {"model": ChatOut}},
)
async def create_personal_chat(
    ride_id: str, body: PersonalChatBody, response: Response, user: CurrentUser, db: Db
) -> ChatOut:
    ride = await get_ride(db, ride_id)
    rider_id = body.rider_id
    registration = await db.get(RideRegistration, (ride.id, rider_id))
    if registration is None or rider_id == ride.driver_id or user.id not in (ride.driver_id, rider_id):
        raise HTTPException(status_code=403, detail="You cannot access this personal chat")
    chat = await find_or_create(db, ride.id, "personal", rider_id, response)
    return chat_out(chat, [ride.driver_id, rider_id])


@router.post(
    "/rides/{ride_id}/chats/group", status_code=201, response_model=ChatOut,
    operation_id="createGroupChat", responses={200: {"model": ChatOut}},
)
async def create_group_chat(
    ride_id: str, response: Response, user: CurrentUser, db: Db
) -> ChatOut:
    ride = await get_ride(db, ride_id)
    registration = await db.get(RideRegistration, (ride.id, user.id))
    if user.id != ride.driver_id and registration is None:
        raise HTTPException(status_code=403, detail="You cannot access this group chat")
    chat = await find_or_create(db, ride.id, "group", "", response)
    return chat_out(chat, await participants(db, chat, ride))


@router.get("/chats", response_model=list[ChatOut], operation_id="listChats")
async def get_chats(user: CurrentUser, db: Db) -> list[ChatOut]:
    # Restrict candidates in SQL, then apply the current membership policy.
    registered_rides = select(RideRegistration.ride_id).where(RideRegistration.rider_id == user.id)
    query = select(Chat, Ride).join(Ride, Chat.ride_id == Ride.id).where(
        or_(Ride.driver_id == user.id, Chat.ride_id.in_(registered_rides))
    ).order_by(ChatRecord.id)
    result = []
    for chat, ride in (await db.execute(query)).all():
        member_ids = await participants(db, chat, ride)
        if user.id in member_ids:
            result.append(chat_out(chat, member_ids))
    return result


def message_out(message: MessageRecord) -> ChatMessage:
    timestamp = message.created_at
    # SQLite drops timezone information; all timestamps written here are UTC.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=UTC)
    return ChatMessage(
        id=message.id, chat_id=message.chat_id, sender_id=message.sender_id,
        content=message.content, created_at=timestamp.isoformat(),
    )


def encode_cursor(message: MessageRecord) -> str:
    payload = [message.chat_id, message_out(message).created_at, message.id]
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")


def decode_cursor(cursor: str, chat_id: str) -> tuple[datetime, str]:
    try:
        data = json.loads(base64.b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True))
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError
        cursor_chat, timestamp, message_id = data
        if cursor_chat != chat_id or not isinstance(timestamp, str):
            raise ValueError
        timestamp = datetime.fromisoformat(timestamp)
        if timestamp.tzinfo is None:
            raise ValueError
        if not isinstance(message_id, str) or not message_id:
            raise ValueError
        return timestamp.astimezone(UTC), message_id
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid message cursor") from None


@router.get(
    "/chats/{chat_id}/messages", response_model=MessagePage, operation_id="listChatMessages"
)
async def list_chat_messages(
    chat_id: str, user: CurrentUser, db: Db,
    cursor: str | None = None, limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MessagePage:
    chat = await accessible_chat(db, chat_id, user.id)
    query = select(MessageRecord).where(MessageRecord.chat_id == chat.id)
    if cursor is not None:
        timestamp, message_id = decode_cursor(cursor, chat.id)
        query = query.where(or_(
            MessageRecord.created_at < timestamp,
            and_(MessageRecord.created_at == timestamp, MessageRecord.id < message_id),
        ))
    rows = list((await db.scalars(query.order_by(
        MessageRecord.created_at.desc(), MessageRecord.id.desc()
    ).limit(limit + 1))).all())
    page = rows[:limit]
    return MessagePage(
        messages=[message_out(message) for message in page],
        next_cursor=encode_cursor(page[-1]) if len(rows) > limit else None,
    )


@router.post(
    "/chats/{chat_id}/messages", status_code=201, response_model=ChatMessage,
    operation_id="sendChatMessage",
)
async def send_chat_message(
    chat_id: str, body: MessageBody, user: CurrentUser, db: Db
) -> ChatMessage:
    chat = await accessible_chat(db, chat_id, user.id)
    message = MessageRecord(chat_id=chat.id, sender_id=user.id, content=body.content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message_out(message)
