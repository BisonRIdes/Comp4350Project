import base64
import json
from datetime import UTC, datetime
from typing import Literal

from fastapi import HTTPException, Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatRecord, MessageRecord, Ride, RideRegistration
from schemas import Chat, ChatMessage, CreatePersonalChatRequest, SendMessageRequest


class PersonalChatBody(CreatePersonalChatRequest):
    rider_id: str


class MessageBody(SendMessageRequest):
    content: str = Field(min_length=1)


class ChatType(Chat):
    type: Literal["personal", "group"]


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
    return (
        []
        if chat.type == "personal" and not riders
        else list(dict.fromkeys([ride.driver_id, *riders]))
    )


def chat_out(chat: ChatRecord, member_ids: list[str]) -> ChatType:
    return ChatType(id=chat.id, ride_id=chat.ride_id, type=chat.type, participant_ids=member_ids)


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


def message_out(message: MessageRecord) -> ChatMessage:
    timestamp = message.created_at
    # SQLite drops timezone information; all timestamps written here are UTC.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=UTC)
    return ChatMessage(
        id=message.id,
        chat_id=message.chat_id,
        sender_id=message.sender_id,
        content=message.content,
        created_at=timestamp.isoformat(),
    )


def encode_cursor(message: MessageRecord) -> str:
    payload = [message.chat_id, message_out(message).created_at, message.id]
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")


def decode_cursor(cursor: str, chat_id: str) -> tuple[datetime, str]:
    try:
        data = json.loads(
            base64.b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True)
        )
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
