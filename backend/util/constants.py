from typing import Final

USERNAME_LENGTH: Final = 36

PASSWORD_MIN_LENGTH: Final = 8
PASSWORD_MAX_LENGTH: Final = 128

# Only UManitoba students can sign up, and every student email ends in this domain.
STUDENT_EMAIL_DOMAIN: Final = "myumanitoba.ca"

# How long a login lasts before the user has to log in again.
ACCESS_TOKEN_HOURS: Final = 24
# How long the link in the verification email works.
VERIFY_TOKEN_HOURS: Final = 24

# longitude and latitude of the U of M campus
U_OF_M_COORD = {"type": "Point", "coordinates": [-97.14, 49.81]}

# Stripe's smallest card payment in Canadian dollars is $0.50, so a seat can't cost less.
MIN_PRICE_CENTS: Final = 50

# Failed logins allowed for one email before /auth/login stops checking passwords for a while.
MAX_FAILED_LOGINS: Final = 5
FAILED_LOGIN_WINDOW_SECONDS: Final = 15 * 60
