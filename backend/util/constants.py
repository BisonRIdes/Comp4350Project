from typing import Final

USERNAME_LENGTH: Final = 36

# Only UManitoba students can sign up, and every student email ends in this domain.
STUDENT_EMAIL_DOMAIN: Final = "myumanitoba.ca"

# How long a login lasts before the user has to log in again.
ACCESS_TOKEN_HOURS: Final = 24
# How long the link in the verification email works.
VERIFY_TOKEN_HOURS: Final = 24
