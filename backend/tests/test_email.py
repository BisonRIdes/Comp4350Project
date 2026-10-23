import json
import logging
import urllib.error
import urllib.request
from unittest.mock import MagicMock

from util.email import RESEND_URL, USER_AGENT, send_verification_email


def fake_urlopen(sent: list):
    def urlopen(request, timeout):
        sent.append(request)
        return MagicMock()

    return urlopen


async def test_without_api_key_the_link_is_only_logged(monkeypatch, caplog):
    sent = []
    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen(sent))
    monkeypatch.setenv("FRONTEND_URL", "https://bisonrides.vercel.app")

    with caplog.at_level(logging.WARNING):
        await send_verification_email("alice@myumanitoba.ca", "abc")

    assert sent == []
    assert "https://bisonrides.vercel.app/verify?token=abc" in caplog.text


async def test_with_api_key_the_email_goes_to_resend(monkeypatch):
    sent = []
    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen(sent))
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("FRONTEND_URL", "https://bisonrides.vercel.app")

    await send_verification_email("alice@myumanitoba.ca", "abc")

    assert len(sent) == 1
    request = sent[0]
    message = json.loads(request.data)
    assert request.full_url == RESEND_URL
    assert request.get_header("Authorization") == "Bearer re_test"
    # without it Resend's firewall rejects the request (see USER_AGENT)
    assert request.get_header("User-agent") == USER_AGENT
    assert message["to"] == ["alice@myumanitoba.ca"]
    assert "https://bisonrides.vercel.app/verify?token=abc" in message["text"]


async def test_a_failed_email_is_logged_not_raised(monkeypatch, caplog):
    def broken_urlopen(request, timeout):
        raise urllib.error.URLError("no network")

    monkeypatch.setattr(urllib.request, "urlopen", broken_urlopen)
    monkeypatch.setenv("RESEND_API_KEY", "re_test")

    with caplog.at_level(logging.ERROR):
        await send_verification_email("alice@myumanitoba.ca", "abc")

    assert "Could not send verification email" in caplog.text
