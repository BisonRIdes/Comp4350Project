import asyncio
import hashlib
import os
import secrets


async def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = await asyncio.to_thread(
        hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    )
    return f"{salt.hex()}${digest.hex()}"


async def verify_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$")
    digest = await asyncio.to_thread(
        hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    )
    return secrets.compare_digest(digest, bytes.fromhex(digest_hex))
