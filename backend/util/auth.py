"""Works out which student is calling from the login token in the Authorization header."""

from typing import Annotated

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from util.tokens import read_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Return the logged-in user, or 401 if the token is missing, invalid or expired."""
    user_id = read_token(credentials.credentials, "access") if credentials else None
    user = await db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(
            status_code=401, detail="Log in to continue", headers={"WWW-Authenticate": "Bearer"}
        )
    return user


# Add `user: CurrentUser` to a route to require a login and get the caller.
CurrentUser = Annotated[User, Depends(get_current_user)]
