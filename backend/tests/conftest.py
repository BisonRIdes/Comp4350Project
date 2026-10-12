from pathlib import Path

from dotenv import load_dotenv

# use the test env vars
# must preceed the database import as it loads the env vars
load_dotenv(Path(__file__).parent.parent / ".env.test", override=True)

import pytest_asyncio

from database import Base, engine


@pytest_asyncio.fixture(autouse=True)
async def fresh_database():
    # sanity check
    assert "test" in str(engine.url), f"Refusing to reset non-test DB: {engine.url}"
    # create new db
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # delete db after finishing test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()