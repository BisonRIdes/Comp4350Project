import re

from schemas import EMAIL_REGEX


def test_match_email_regex():
    assert re.findall(EMAIL_REGEX, "The example e-mail is client@example.ca")
    assert re.findall(EMAIL_REGEX, "Hello from en.namu@jrfd.org")

def test_fullmatch_email_regex():
    assert re.fullmatch(EMAIL_REGEX, "janedoe@gmail.com")
    assert re.fullmatch(EMAIL_REGEX, "johndoe@hotmail.com")
    assert re.fullmatch(EMAIL_REGEX, "instructor@umanitoba.ca")
    assert re.fullmatch(EMAIL_REGEX, "john.doe@university.ca")
    assert re.fullmatch(EMAIL_REGEX, "exjkcdr@jfjffllg.ott")

def test_no_email_regex():

    assert re.match(EMAIL_REGEX, "This excerpt contains no email") is None
    assert re.match(EMAIL_REGEX, "another excerpt with no emails") is None

def test_invalid_email_regex():
    assert re.match(EMAIL_REGEX, "Test with invalid email address @udfush@hfhdfhj.cos") is None
    assert re.match(EMAIL_REGEX, "Another invalid e-mail user@domain@anotherdomain@rootdomain.com") is None