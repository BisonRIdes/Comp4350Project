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

# Message limit length allowed in chat messages
MESSAGE_LENGTH: Final = 512

# Failed logins allowed for one email before /auth/login stops checking passwords for a while.
MAX_FAILED_LOGINS: Final = 5
FAILED_LOGIN_WINDOW_SECONDS: Final = 15 * 60

# Ratings are whole stars from 1 to 5, with an optional short comment.
MIN_STARS: Final = 1
MAX_STARS: Final = 5
RATING_COMMENT_LENGTH: Final = 500
# How many of the newest comments a user's rating summary shows.
RECENT_RATING_COMMENTS: Final = 5
