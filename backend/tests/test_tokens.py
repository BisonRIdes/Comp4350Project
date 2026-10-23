from util.tokens import create_token, read_token


def test_token_round_trip():
    token = create_token("user-1", "access", hours=1)

    assert read_token(token, "access") == "user-1"


def test_token_with_wrong_purpose_is_rejected():
    token = create_token("user-1", "verify", hours=1)

    assert read_token(token, "access") is None


def test_expired_token_is_rejected():
    token = create_token("user-1", "access", hours=-1)

    assert read_token(token, "access") is None


def test_tampered_token_is_rejected():
    token = create_token("user-1", "access", hours=1)
    header, payload, signature = token.split(".")
    tampered = f"{header}.{payload}.{signature[::-1]}"

    assert read_token(tampered, "access") is None


def test_garbage_token_is_rejected():
    assert read_token("not-a-token", "access") is None
