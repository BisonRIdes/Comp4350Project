import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import SessionLocal
from models import ChatRecord, MessageRecord, RideRegistration
from tests.helpers import (
    auth,
    client,
    find_or_create_chat,
    make_registration,
    make_ride,
    make_user,
    synchronize_session_commits,
)
from util.chat_utils import find_or_create


async def test_create_personal_chat_and_reuse_existing_chat():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)

    response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    chat = response.json()
    assert chat["ride_id"] == ride_id
    assert chat["type"] == "personal"
    assert chat["participant_ids"] == [driver_id, rider_id]

    reused = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(rider_id),
    )

    assert reused.status_code == 200
    assert reused.json()["id"] == chat["id"]


async def test_registered_rider_can_create_private_chat_with_driver():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    other_rider_id = await make_user("other")
    ride_id = await make_ride(driver_id)

    await make_registration(ride_id, rider_id)
    await make_registration(ride_id, other_rider_id)

    response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(rider_id),
    )

    assert response.status_code == 201
    chat = response.json()
    assert chat["type"] == "personal"
    assert chat["participant_ids"] == [driver_id, rider_id]

    other_rider_chats = client.get("/chats", headers=auth(other_rider_id))

    assert other_rider_chats.status_code == 200
    assert all(item["id"] != chat["id"] for item in other_rider_chats.json())


async def test_each_rider_gets_a_separate_personal_chat_with_driver():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    other_rider_id = await make_user("other")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    await make_registration(ride_id, other_rider_id)

    rider_response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(rider_id),
    )
    other_rider_response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": other_rider_id},
        headers=auth(other_rider_id),
    )

    assert rider_response.status_code == 201
    assert other_rider_response.status_code == 201
    rider_chat = rider_response.json()
    other_rider_chat = other_rider_response.json()
    assert rider_chat["id"] != other_rider_chat["id"]
    assert rider_chat["participant_ids"] == [driver_id, rider_id]
    assert other_rider_chat["participant_ids"] == [driver_id, other_rider_id]

    rider_chats = client.get("/chats", headers=auth(rider_id)).json()
    other_rider_chats = client.get("/chats", headers=auth(other_rider_id)).json()
    driver_chats = client.get("/chats", headers=auth(driver_id)).json()
    assert {chat["id"] for chat in rider_chats} == {rider_chat["id"]}
    assert {chat["id"] for chat in other_rider_chats} == {other_rider_chat["id"]}
    assert {chat["id"] for chat in driver_chats} == {
        rider_chat["id"],
        other_rider_chat["id"],
    }


@pytest.mark.parametrize("kind", ["personal", "group"])
async def test_concurrent_create_chat_reuses_the_winning_chat(kind, monkeypatch):
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    rider_key = rider_id if kind == "personal" else ""
    synchronize_session_commits(monkeypatch)

    responses = [Response(), Response()]
    chats = await asyncio.gather(
        *(
            find_or_create_chat(ride_id, kind, rider_key, response)
            for response in responses
        )
    )

    assert sorted(response.status_code for response in responses) == [200, 201]
    assert chats[0].id == chats[1].id
    async with SessionLocal() as db:
        saved_chats = list(
            (
                await db.scalars(
                    select(ChatRecord).where(
                        ChatRecord.ride_id == ride_id,
                        ChatRecord.type == kind,
                        ChatRecord.rider_key == rider_key,
                    )
                )
            ).all()
        )
    assert len(saved_chats) == 1


async def test_create_chat_reraises_integrity_error_when_no_concurrent_chat_exists():
    db = AsyncMock(spec=AsyncSession)
    db.scalar.return_value = None
    db.commit.side_effect = IntegrityError("INSERT", {}, Exception("constraint violation"))

    with pytest.raises(IntegrityError, match="constraint violation"):
        await find_or_create(db, "ride-id", "personal", "rider-id", Response())

    db.rollback.assert_awaited_once()
    assert db.scalar.await_count == 2


@pytest.mark.parametrize("caller", ["outsider", "driver"])
async def test_create_personal_chat_requires_registered_rider_and_participant(caller):
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    outsider_id = await make_user("outsider")
    ride_id = await make_ride(driver_id)
    caller_id = outsider_id if caller == "outsider" else driver_id

    response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(caller_id),
    )

    assert response.status_code == 403


async def test_create_personal_chat_rejects_driver_as_rider():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, driver_id)

    response = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": driver_id},
        headers=auth(driver_id),
    )

    assert response.status_code == 403


async def test_create_personal_chat_ride_not_found():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")

    response = client.post(
        "/rides/missing/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(driver_id),
    )

    assert response.status_code == 404


async def test_create_group_chat_for_driver_and_registered_rider():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    other_rider_id = await make_user("other")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    await make_registration(ride_id, other_rider_id)

    response = client.post(f"/rides/{ride_id}/chats/group", headers=auth(rider_id))

    assert response.status_code == 201
    chat = response.json()
    assert chat["ride_id"] == ride_id
    assert chat["type"] == "group"
    assert chat["participant_ids"] == [driver_id, *sorted([rider_id, other_rider_id])]

    reused = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id))

    assert reused.status_code == 200
    assert reused.json()["id"] == chat["id"]


async def test_create_group_chat_rejects_nonparticipant():
    driver_id = await make_user("driver", True)
    outsider_id = await make_user("outsider")
    ride_id = await make_ride(driver_id)

    response = client.post(f"/rides/{ride_id}/chats/group", headers=auth(outsider_id))

    assert response.status_code == 403


async def test_list_chats_only_returns_chats_for_current_participants():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    other_rider_id = await make_user("other")
    outsider_id = await make_user("outsider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    await make_registration(ride_id, other_rider_id)

    group = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()
    personal = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(driver_id),
    ).json()

    rider_chats = client.get("/chats", headers=auth(rider_id))
    other_rider_chats = client.get("/chats", headers=auth(other_rider_id))
    outsider_chats = client.get("/chats", headers=auth(outsider_id))

    assert {chat["id"] for chat in rider_chats.json()} == {group["id"], personal["id"]}
    assert [chat["id"] for chat in other_rider_chats.json()] == [group["id"]]
    assert outsider_chats.json() == []


async def test_cancelled_rider_no_longer_sees_personal_chat():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(
        f"/rides/{ride_id}/chats/personal",
        json={"rider_id": rider_id},
        headers=auth(driver_id),
    ).json()

    async with SessionLocal() as db:
        registration = await db.get(RideRegistration, (ride_id, rider_id))
        await db.delete(registration)
        await db.commit()

    response = client.get("/chats", headers=auth(driver_id))

    assert response.status_code == 200
    assert all(item["id"] != chat["id"] for item in response.json())


async def test_send_chat_message_persists_message():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()

    response = client.post(
        f"/chats/{chat['id']}/messages",
        json={"content": "See you at the pickup spot"},
        headers=auth(rider_id),
    )

    assert response.status_code == 201
    message = response.json()
    assert message["chat_id"] == chat["id"]
    assert message["sender_id"] == rider_id
    assert message["content"] == "See you at the pickup spot"
    assert message["created_at"]
    async with SessionLocal() as db:
        saved = await db.get(MessageRecord, message["id"])
        assert saved is not None
        assert saved.content == message["content"]


async def test_send_chat_message_rejects_empty_content():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()

    response = client.post(
        f"/chats/{chat['id']}/messages",
        json={"content": ""},
        headers=auth(rider_id),
    )

    assert response.status_code == 422


async def test_nonparticipant_cannot_send_or_list_chat_messages():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    outsider_id = await make_user("outsider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()

    list_response = client.get(f"/chats/{chat['id']}/messages", headers=auth(outsider_id))
    send_response = client.post(
        f"/chats/{chat['id']}/messages",
        json={"content": "Not a member"},
        headers=auth(outsider_id),
    )

    assert list_response.status_code == 403
    assert send_response.status_code == 403


async def test_list_chat_messages_uses_descending_cursor_pages():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()
    first_time = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)
    async with SessionLocal() as db:
        db.add_all(
            [
                MessageRecord(
                    id=f"message-{index}",
                    chat_id=chat["id"],
                    sender_id=rider_id,
                    content=f"message {index}",
                    created_at=first_time + timedelta(minutes=index),
                )
                for index in range(3)
            ]
        )
        await db.commit()

    first_page = client.get(f"/chats/{chat['id']}/messages?limit=2", headers=auth(rider_id))

    assert first_page.status_code == 200
    page = first_page.json()
    assert [message["id"] for message in page["messages"]] == ["message-2", "message-1"]
    assert page["next_cursor"]

    second_page = client.get(
        f"/chats/{chat['id']}/messages",
        params={"limit": 2, "cursor": page["next_cursor"]},
        headers=auth(rider_id),
    )

    assert second_page.status_code == 200
    assert [message["id"] for message in second_page.json()["messages"]] == ["message-0"]
    assert second_page.json()["next_cursor"] is None


async def test_list_chat_messages_rejects_invalid_cursor_and_limit():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    chat = client.post(f"/rides/{ride_id}/chats/group", headers=auth(driver_id)).json()

    bad_cursor = client.get(
        f"/chats/{chat['id']}/messages?cursor=not-a-cursor", headers=auth(rider_id)
    )
    bad_limit = client.get(f"/chats/{chat['id']}/messages?limit=0", headers=auth(rider_id))

    assert bad_cursor.status_code == 422
    assert bad_cursor.json() == {"detail": "Invalid message cursor"}
    assert bad_limit.status_code == 422


async def test_list_chat_messages_not_found():
    rider_id = await make_user("rider")

    response = client.get("/chats/missing/messages", headers=auth(rider_id))

    assert response.status_code == 404
